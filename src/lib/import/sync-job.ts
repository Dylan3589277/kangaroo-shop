import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/prisma';
import type {
  ImportPlatform,
  ImportPreviewItem,
  ImportPreviewResult,
  ParsedProductRow,
  ParseResult,
  ImportExecuteResult,
} from '@/types/import';
import { parseAmazonReport } from './amazon-report';
import { parseRakutenCsv } from './rakuten-csv';

const MAX_EXECUTE_ROWS = 5000;

function sha256Text(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function importConfirmationSecret(): string {
  const secret = process.env.IMPORT_CONFIRMATION_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== 'production') return 'kangaroo-shop-import-preview-dev-secret';
  throw new Error('IMPORT_CONFIRMATION_SECRET or NEXTAUTH_SECRET is required');
}

function buildConfirmationPayload(platform: ImportPlatform, fileName: string, fileSha256: string, totalRows: number) {
  return `${platform}\n${fileName}\n${fileSha256}\n${totalRows}`;
}

export function buildImportConfirmationToken(
  platform: ImportPlatform,
  fileName: string,
  fileSha256: string,
  totalRows: number,
): string {
  return createHmac('sha256', importConfirmationSecret())
    .update(buildConfirmationPayload(platform, fileName, fileSha256, totalRows), 'utf8')
    .digest('hex');
}

export function verifyImportConfirmationToken(
  token: string | null | undefined,
  platform: ImportPlatform,
  fileName: string,
  fileSha256: string,
  totalRows: number,
): boolean {
  if (!token) return false;
  const expected = buildImportConfirmationToken(platform, fileName, fileSha256, totalRows);
  const tokenBuffer = Buffer.from(token, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return tokenBuffer.length === expectedBuffer.length && timingSafeEqual(tokenBuffer, expectedBuffer);
}

function normalisePlatform(value: string | null | undefined): ImportPlatform {
  if (value === 'rakuten' || value === 'amazon' || value === 'own') return value;
  throw new Error('Unsupported platform');
}

export function parseImportFile(platformValue: string | null | undefined, text: string): ParseResult {
  const platform = normalisePlatform(platformValue);
  if (platform === 'rakuten') return parseRakutenCsv(text);
  if (platform === 'amazon') return parseAmazonReport(text);
  return parseOwnCsv(text);
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuote && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === ',' && !inQuote) {
      row.push(cell.trim());
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuote) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
}

function parseOwnCsv(text: string): ParseResult {
  const lines = parseCsvRows(text.trim());
  const rows: ParsedProductRow[] = [];
  const errors: ParseResult['errors'] = [];
  if (lines.length < 2) {
    return { platform: 'own', rows, errors: [{ rowIndex: 0, message: 'CSVにデータ行がありません' }], totalRows: 0, skippedRows: 0 };
  }
  const headers = lines[0].map(h => h.trim());
  let skippedRows = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i];
    if (!cols.length || cols.every(c => !c.trim())) {
      skippedRows++;
      continue;
    }
    const rawRow: Record<string, string> = {};
    headers.forEach((h, idx) => { rawRow[h] = cols[idx] ?? ''; });
    const price = parseInt((rawRow.price ?? rawRow.価格 ?? rawRow.售价 ?? '').replace(/[,，]/g, ''), 10);
    const stock = parseInt(rawRow.stock ?? rawRow.在庫数 ?? rawRow.库存 ?? '0', 10);
    const parsed: ParsedProductRow = {
      rowIndex: i - 1,
      rawRow,
      platformSku: rawRow.sku || rawRow.SKU || undefined,
      platformItemId: rawRow.id || rawRow.productId || rawRow.sku || undefined,
      titleJa: rawRow.titleJa || rawRow.title || rawRow.商品名 || rawRow.标题 || undefined,
      titleEn: rawRow.titleEn || undefined,
      brand: rawRow.brand || rawRow.品牌 || undefined,
      platformPrice: Number.isFinite(price) ? price : undefined,
      stock: Number.isFinite(stock) ? stock : 0,
      description: rawRow.description || rawRow.商品説明 || rawRow.描述 || undefined,
      category: rawRow.category || rawRow.分类 || undefined,
      images: (rawRow.images || rawRow.image || rawRow.画像URL1 || '').split(/[\n|;]/).map(s => s.trim()).filter(Boolean),
      platformUrl: rawRow.url || rawRow.sourceUrl || undefined,
    };
    if (!parsed.titleJa && !parsed.platformSku) {
      errors.push({ rowIndex: i - 1, message: '商品名/SKUが空です', rawRow });
      skippedRows++;
      continue;
    }
    rows.push(parsed);
  }
  return { platform: 'own', rows, errors, totalRows: lines.length - 1, skippedRows };
}

export async function buildImportPreview(
  platformValue: string | null | undefined,
  fileName: string,
  text: string,
): Promise<{ parse: ParseResult; preview: ImportPreviewResult }> {
  const parse = parseImportFile(platformValue, text);
  if (parse.rows.length > MAX_EXECUTE_ROWS) {
    throw new Error(`Import row limit exceeded: ${MAX_EXECUTE_ROWS}`);
  }
  const skuValues = Array.from(new Set(parse.rows.map(row => row.platformSku).filter(Boolean) as string[]));
  const itemIdValues = Array.from(new Set(parse.rows.map(row => row.platformItemId).filter(Boolean) as string[]));
  const existingListings = skuValues.length || itemIdValues.length
    ? await prisma.productPlatformListing.findMany({
        where: {
          platform: parse.platform,
          OR: [
            skuValues.length ? { platformSku: { in: skuValues } } : undefined,
            itemIdValues.length ? { platformItemId: { in: itemIdValues } } : undefined,
          ].filter(Boolean) as { platformSku?: { in: string[] }; platformItemId?: { in: string[] } }[],
        },
        select: { productId: true, platformSku: true, platformItemId: true },
      })
    : [];
  const existingBySku = new Map(existingListings.filter(item => item.platformSku).map(item => [item.platformSku, item.productId]));
  const existingByItemId = new Map(existingListings.filter(item => item.platformItemId).map(item => [item.platformItemId, item.productId]));
  const pendingCreateProductId = '同文件前序行';
  const items: ImportPreviewItem[] = [];
  let toCreate = 0;
  let toUpdate = 0;
  let toSkip = parse.skippedRows;

  for (const row of parse.rows) {
    const existingProductId = (row.platformSku ? existingBySku.get(row.platformSku) : undefined)
      ?? (row.platformItemId ? existingByItemId.get(row.platformItemId) : undefined);

    const missingTitle = !row.titleJa && !row.titleEn && !row.titleZh;
    const action: ImportPreviewItem['action'] = missingTitle ? 'skip' : existingProductId ? 'update' : 'create';
    if (action === 'create') {
      toCreate++;
      if (row.platformSku) existingBySku.set(row.platformSku, pendingCreateProductId);
      if (row.platformItemId) existingByItemId.set(row.platformItemId, pendingCreateProductId);
    } else if (action === 'update') toUpdate++;
    else toSkip++;

    if (items.length < 200) {
      items.push({
        rowIndex: row.rowIndex,
        action,
        reason: missingTitle ? '缺少商品名' : undefined,
        platformSku: row.platformSku,
        titleJa: row.titleJa,
        platformPrice: row.platformPrice,
        existingProductId,
      });
    }
  }

  const fileSha256 = sha256Text(text);

  return {
    parse,
    preview: {
      platform: parse.platform,
      fileName,
      totalRows: parse.totalRows,
      toCreate,
      toUpdate,
      toSkip,
      parseErrors: parse.errors.length,
      items,
      fileSha256,
      confirmationToken: buildImportConfirmationToken(parse.platform, fileName, fileSha256, parse.totalRows),
    },
  };
}

function productDataFromRow(platform: ImportPlatform, row: ParsedProductRow, asDraft: boolean) {
  const title = row.titleZh || row.titleJa || row.titleEn || row.platformSku || 'Imported Product';
  return {
    title,
    titleEn: row.titleEn ?? null,
    titleJa: row.titleJa ?? null,
    brand: row.brand ?? null,
    price: row.platformPrice ?? 0,
    images: row.images ?? [],
    category: row.category || 'brainrot',
    source: platform,
    sourceUrl: row.platformUrl ?? null,
    stock: row.stock ?? 0,
    inStock: (row.stock ?? 0) > 0,
    description: row.description ?? null,
    ...(asDraft ? { isActive: false } : {}),
  };
}

export async function executeImport(
  platformValue: string | null | undefined,
  fileName: string,
  text: string,
): Promise<ImportExecuteResult> {
  const parse = parseImportFile(platformValue, text);
  if (parse.rows.length > MAX_EXECUTE_ROWS) {
    throw new Error(`Import row limit exceeded: ${MAX_EXECUTE_ROWS}`);
  }
  const job = await prisma.syncJob.create({
    data: {
      platform: parse.platform,
      status: 'running',
      fileName,
      totalRows: parse.totalRows,
      meta: { parseErrors: parse.errors.length, skippedRows: parse.skippedRows },
    },
  });

  let created = 0;
  let updated = 0;
  let skipped = parse.skippedRows + parse.errors.length;
  let errors = parse.errors.length;

  for (const row of parse.rows) {
    try {
      const missingTitle = !row.titleJa && !row.titleEn && !row.titleZh;
      if (missingTitle) {
        skipped++;
        await prisma.syncJobItem.create({
          data: { syncJobId: job.id, rowIndex: row.rowIndex, platformSku: row.platformSku, status: 'skipped', rawRow: row.rawRow, errorMsg: '缺少商品名' },
        });
        continue;
      }

      const existingListing = row.platformSku || row.platformItemId
        ? await prisma.productPlatformListing.findFirst({
            where: {
              platform: parse.platform,
              OR: [
                row.platformSku ? { platformSku: row.platformSku } : undefined,
                row.platformItemId ? { platformItemId: row.platformItemId } : undefined,
              ].filter(Boolean) as { platformSku?: string; platformItemId?: string }[],
            },
          })
        : null;

      let productId: string;
      if (existingListing) {
        const product = await prisma.product.update({
          where: { id: existingListing.productId },
          data: productDataFromRow(parse.platform, row, false),
        });
        productId = product.id;
        updated++;
      } else {
        const product = await prisma.product.create({ data: productDataFromRow(parse.platform, row, true) });
        productId = product.id;
        await prisma.productPlatformListing.create({
          data: {
            productId,
            platform: parse.platform,
            platformItemId: row.platformItemId ?? null,
            platformSku: row.platformSku ?? null,
            platformPrice: row.platformPrice ?? null,
            platformUrl: row.platformUrl ?? null,
            status: 'draft',
            rawData: row.rawRow,
          },
        });
        created++;
      }

      await prisma.syncJobItem.create({
        data: { syncJobId: job.id, rowIndex: row.rowIndex, platformSku: row.platformSku, status: existingListing ? 'updated' : 'created', productId, rawRow: row.rawRow },
      });
    } catch (err) {
      errors++;
      await prisma.syncJobItem.create({
        data: { syncJobId: job.id, rowIndex: row.rowIndex, platformSku: row.platformSku, status: 'error', rawRow: row.rawRow, errorMsg: err instanceof Error ? err.message : 'Unknown error' },
      });
    }
  }

  await prisma.syncJob.update({
    where: { id: job.id },
    data: {
      status: errors > 0 ? 'failed' : 'done',
      doneRows: created + updated,
      errorRows: errors,
    },
  });

  return { syncJobId: job.id, platform: parse.platform, totalRows: parse.totalRows, created, updated, skipped, errors };
}
