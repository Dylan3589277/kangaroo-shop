/**
 * Amazon セラーセントラル レポート TSV/CSV 解析器
 *
 * 目标格式：GET_FLAT_FILE_OPEN_LISTINGS_DATA（在售商品レポート）
 * 主要列名（英文）：
 *   asin1, seller-sku, item-name, price, quantity, item-description, image-url, product-id
 *
 * Amazon レポートはタブ区切り（TSV）、ヘッダー行あり、UTF-8 エンコード。
 */

import type { ParsedProductRow, ParseResult, ParseError } from '@/types/import';

// Amazon レポート列名 → 内部字段映射
const COLUMN_MAP: Record<string, string> = {
  'asin1': 'platformItemId',
  'asin': 'platformItemId',
  'seller-sku': 'platformSku',
  'seller_sku': 'platformSku',
  'sku': 'platformSku',
  'item-name': 'titleJa',        // Amazon JP は通常日本語タイトル
  'item_name': 'titleJa',
  'title': 'titleJa',
  'price': 'platformPrice',
  'quantity': 'stock',
  'item-description': 'description',
  'item_description': 'description',
  'image-url': '_images',
  'image_url': '_images',
  'main-image-url': '_images',
  'product-id': 'platformItemId', // フォールバック
};

/** カンマ区切り CSV のフォールバックパーサー */
function parseCsvLineSimple(line: string): string[] {
  const result: string[] = [];
  let cell = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cell += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      result.push(cell.trim());
      cell = '';
    } else {
      cell += ch;
    }
  }
  result.push(cell.trim());
  return result;
}

export function parseAmazonReport(fileText: string): ParseResult {
  const rawLines = fileText.trim().split(/\r?\n/);
  const errors: ParseError[] = [];
  const rows: ParsedProductRow[] = [];

  if (rawLines.length < 2) {
    return { platform: 'amazon', rows: [], errors: [{ rowIndex: 0, message: 'レポートにデータ行がありません' }], totalRows: 0, skippedRows: 0 };
  }

  // タブ区切りか判定
  const isTsv = rawLines[0].includes('\t');
  const splitLine = (line: string) => isTsv ? line.split('\t').map(c => c.trim()) : parseCsvLineSimple(line);

  const headers = splitLine(rawLines[0]).map(h => h.toLowerCase().trim());
  let skippedRows = 0;

  for (let i = 1; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) { skippedRows++; continue; }

    const cols = splitLine(line);
    const rawRow: Record<string, string> = {};
    headers.forEach((h, idx) => { rawRow[h] = cols[idx] ?? ''; });

    const parsed: ParsedProductRow = { rawRow, rowIndex: i - 1 };

    for (const [colName, field] of Object.entries(COLUMN_MAP)) {
      const val = rawRow[colName];
      if (!val) continue;

      if (field === '_images') {
        parsed.images = [val];
      } else if (field === 'platformPrice') {
        const num = parseFloat(val.replace(/[¥$,，]/g, ''));
        if (!isNaN(num)) parsed.platformPrice = Math.round(num); // 整数化（JPY）
      } else if (field === 'stock') {
        const num = parseInt(val, 10);
        if (!isNaN(num)) parsed.stock = num;
      } else if (!(parsed as unknown as Record<string, unknown>)[field]) {
        // 先勝ち（asin1 > product-id など）
        (parsed as unknown as Record<string, unknown>)[field] = val;
      }
    }

    // プラットフォーム URL 組み立て
    if (parsed.platformItemId && !parsed.platformUrl) {
      parsed.platformUrl = `https://www.amazon.co.jp/dp/${parsed.platformItemId}`;
    }

    if (!parsed.titleJa && !parsed.platformSku && !parsed.platformItemId) {
      errors.push({ rowIndex: i - 1, message: 'ASIN/SKU/タイトルが全て空欄です', rawRow });
      skippedRows++;
      continue;
    }

    rows.push(parsed);
  }

  return {
    platform: 'amazon',
    rows,
    errors,
    totalRows: rawLines.length - 1,
    skippedRows,
  };
}
