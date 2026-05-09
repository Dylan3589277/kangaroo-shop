import { executeImport } from '@/lib/import/sync-job';
import type { ParsedProductRow } from '@/types/import';
import { createRakutenRmsClient, type RakutenRmsClient } from './client';

type JsonRecord = Record<string, unknown>;

export type SyncRakutenProductsResult = {
  syncJobId: string;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  syncedAt: string;
};

const DEFAULT_PRODUCTS_PATH = '/product/2/search';
const DEFAULT_MAX_PAGES = 20;

const CSV_HEADERS = [
  '商品管理番号',
  '商品番号',
  '商品名',
  '販売価格',
  '在庫数',
  '商品説明文',
  '画像URL1',
  '画像URL2',
  '画像URL3',
  '画像URL4',
  '画像URL5',
  'カテゴリID',
  'ブランド',
  '商品URL',
];

export function normalizeRakutenRmsProducts(data: unknown): ParsedProductRow[] {
  return extractProductItems(data).map((item, index) => normalizeRakutenRmsProduct(item, index));
}

export async function syncRakutenProductsFromRms(
  options: {
    client?: RakutenRmsClient;
    path?: string;
    maxPages?: number;
    now?: Date;
  } = {}
): Promise<SyncRakutenProductsResult> {
  const client = options.client ?? createRakutenRmsClient();
  const path = options.path ?? process.env.RAKUTEN_RMS_PRODUCTS_PATH ?? DEFAULT_PRODUCTS_PATH;
  const maxPages = normalizeMaxPages(options.maxPages ?? process.env.RAKUTEN_RMS_SYNC_MAX_PAGES);
  const syncedAtDate = options.now ?? new Date();

  const rows: ParsedProductRow[] = [];
  let page = 1;
  for (; page <= maxPages; page++) {
    const response = await client.get<unknown>(path, { params: { page: String(page) } });
    if (!response.ok) {
      throw new Error(`Rakuten RMS products request failed with status ${response.status}`);
    }

    const pageRows = normalizeRakutenRmsProducts(response.data);
    rows.push(...pageRows.map((row, index) => ({ ...row, rowIndex: rows.length + index })));

    if (!hasLikelyNextPage(response.data, page, pageRows.length)) break;
  }

  const csvText = rakutenRowsToCsv(rows);
  const fileName = `rakuten-rms-products-${toFileTimestamp(syncedAtDate)}.csv`;
  const result = await executeImport('rakuten', fileName, csvText);

  return {
    syncJobId: result.syncJobId,
    created: result.created,
    updated: result.updated,
    skipped: result.skipped,
    errors: result.errors,
    syncedAt: syncedAtDate.toISOString(),
  };
}

export function rakutenRowsToCsv(rows: ParsedProductRow[]): string {
  const lines = [CSV_HEADERS.join(',')];
  for (const row of rows) {
    const images = row.images ?? [];
    const values = [
      row.platformSku ?? row.platformItemId ?? '',
      row.platformItemId ?? row.platformSku ?? '',
      row.titleJa ?? row.titleEn ?? row.titleZh ?? '',
      row.platformPrice?.toString() ?? '',
      row.stock?.toString() ?? '',
      row.description ?? '',
      images[0] ?? '',
      images[1] ?? '',
      images[2] ?? '',
      images[3] ?? '',
      images[4] ?? '',
      row.category ?? '',
      row.brand ?? '',
      row.platformUrl ?? '',
    ];
    lines.push(values.map(csvEscape).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function normalizeRakutenRmsProduct(item: unknown, rowIndex: number): ParsedProductRow {
  const record = isRecord(item) ? item : {};
  const rawRow = flattenForRawRow(record);
  const platformSku = firstStringFromRecord(record, [
    'itemNumber',
    'manageNumber',
    'itemManagementNumber',
    'productId',
    'itemId',
    'sku',
  ]);
  const platformItemId = firstStringFromRecord(record, [
    'manageNumber',
    'itemNumber',
    'itemManagementNumber',
    'productId',
    'itemId',
    'sku',
  ]);

  return {
    rowIndex,
    rawRow,
    platformSku,
    platformItemId,
    titleJa: firstStringFromRecord(record, ['itemName', 'productName', 'name', 'title']),
    brand: firstStringFromRecord(record, ['brand', 'brandName', 'makerName']),
    platformPrice: firstNumberFromRecord(record, ['itemPrice', 'price', 'salesPrice', 'taxIncludedPrice', 'priceAmount']),
    stock: firstNumberFromRecord(record, ['inventory', 'stock', 'stockQuantity', 'inventoryCount', 'quantity']) ?? 0,
    description: firstStringFromRecord(record, ['itemCaption', 'caption', 'description', 'catchcopy']),
    category: firstStringFromRecord(record, ['genreId', 'categoryId', 'category', 'categoryName']),
    images: extractImages(record),
    platformUrl: firstStringFromRecord(record, ['itemUrl', 'productUrl', 'url', 'shopUrl']),
  };
}

function extractProductItems(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!isRecord(data)) return [];

  for (const key of ['items', 'Items', 'item', 'results', 'data']) {
    const value = data[key];
    if (Array.isArray(value)) return value;
    if (isRecord(value)) {
      const nested = extractProductItems(value);
      if (nested.length) return nested;
    }
  }

  if (looksLikeProductRecord(data)) return [data];
  return [];
}

function hasLikelyNextPage(data: unknown, currentPage: number, rowCount: number): boolean {
  if (rowCount === 0 || !isRecord(data)) return false;

  const hasNext = firstBooleanFromRecord(data, ['hasNext', 'has_next', 'hasNextPage', 'nextPage']);
  if (hasNext !== undefined) return hasNext;

  const current = firstNumberFromRecord(data, ['page', 'currentPage', 'current_page']) ?? currentPage;
  const totalPages = firstNumberFromRecord(data, ['totalPages', 'total_pages', 'pageCount', 'lastPage']);
  if (totalPages !== undefined) return current < totalPages;

  const total = firstNumberFromRecord(data, ['total', 'totalCount', 'count']);
  const perPage = firstNumberFromRecord(data, ['pageSize', 'perPage', 'hits', 'limit']);
  if (total !== undefined && perPage !== undefined) return current * perPage < total;

  return false;
}

function firstStringFromRecord(record: JsonRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = getDeepValue(record, key);
    const stringValue = stringifyScalar(value);
    if (stringValue) return stringValue;
  }
  return undefined;
}

function firstNumberFromRecord(record: JsonRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = getDeepValue(record, key);
    const numberValue = parseNumber(value);
    if (numberValue !== undefined) return numberValue;
  }
  return undefined;
}

function firstBooleanFromRecord(record: JsonRecord, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = getDeepValue(record, key);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
    }
  }
  return undefined;
}

function getDeepValue(value: unknown, key: string): unknown {
  if (Array.isArray(value)) {
    for (const child of value) {
      const nested = getDeepValue(child, key);
      if (nested !== undefined) return nested;
    }
    return undefined;
  }
  if (!isRecord(value)) return undefined;
  if (value[key] !== undefined) return value[key];
  for (const child of Object.values(value)) {
    if (isRecord(child) || Array.isArray(child)) {
      const nested = getDeepValue(child, key);
      if (nested !== undefined) return nested;
    }
  }
  return undefined;
}

function extractImages(record: JsonRecord): string[] {
  const candidates = [
    getDeepValue(record, 'images'),
    getDeepValue(record, 'image'),
    getDeepValue(record, 'imageUrl'),
    getDeepValue(record, 'imageUrls'),
    getDeepValue(record, 'itemImageUrls'),
  ];
  const images = candidates.flatMap(value => collectImageUrls(value));
  return Array.from(new Set(images)).slice(0, 20);
}

function collectImageUrls(value: unknown): string[] {
  const direct = stringifyScalar(value);
  if (direct && /^https?:\/\//i.test(direct)) return [direct];
  if (Array.isArray(value)) return value.flatMap(item => collectImageUrls(item));
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => {
    if (/url|location|src/i.test(key)) return collectImageUrls(child);
    return isRecord(child) || Array.isArray(child) ? collectImageUrls(child) : [];
  });
}

function looksLikeProductRecord(record: JsonRecord): boolean {
  return ['itemNumber', 'manageNumber', 'itemUrl', 'itemName', 'itemPrice', 'itemCaption', 'images', 'inventory']
    .some(key => getDeepValue(record, key) !== undefined);
}

function flattenForRawRow(record: JsonRecord): Record<string, string> {
  const rawRow: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    const scalar = stringifyScalar(value);
    if (scalar !== undefined) rawRow[key] = scalar;
  }
  return rawRow;
}

function stringifyScalar(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return String(value);
  return undefined;
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== 'string') return undefined;
  const normalized = value
    .replace(/[０-９]/g, digit => String.fromCharCode(digit.charCodeAt(0) - 0xfee0))
    .replace(/[,，\s円￥¥]/g, '')
    .replace(/[^\d.-]/g, '');
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
}

function csvEscape(value: string): string {
  if (!/[",\n\r]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function normalizeMaxPages(value: string | number | undefined): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_PAGES;
  return Math.min(Math.floor(parsed), 100);
}

function toFileTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
