/**
 * 乐天 RMS（楽天市場 Merchant Service）CSV 解析器
 *
 * 目标格式：RMS 商品一覧エクスポート CSV
 * 主要列名（日文）：
 *   商品管理番号, 商品名, 販売価格, 在庫数, 商品説明文, 画像URL1, カテゴリID
 *
 * 注意：乐天 CSV 以 Shift-JIS 编码输出，上传前需由客户端转为 UTF-8。
 * 本解析器假设收到 UTF-8 字符串。
 */

import type { ParsedProductRow, ParseResult, ParseError } from '@/types/import';

// 乐天 CSV 列名 → 内部字段映射（支持常见变体）
const COLUMN_MAP: Record<string, string> = {
  '商品管理番号': 'platformSku',
  '商品番号': 'platformSku',
  '商品名': 'titleJa',
  '商品名（日本語）': 'titleJa',
  '販売価格': 'platformPrice',
  '通常価格': 'platformPrice',
  '在庫数': 'stock',
  '在庫': 'stock',
  '商品説明文': 'description',
  '商品説明': 'description',
  '画像URL1': '_images',
  '商品画像URL': '_images',
  'カテゴリID': 'category',
  'ジャンルID': 'category',
  'ブランド': 'brand',
  'ブランド名': 'brand',
  '商品URL': 'platformUrl',
  'PC用商品URL': 'platformUrl',
};

/** CSV 文本 → 行数组（处理引号包裹、换行） */
function parseCsvLines(text: string): string[][] {
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
      row.push(cell);
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuote) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function parseRakutenCsv(csvText: string): ParseResult {
  const lines = parseCsvLines(csvText.trim());
  const errors: ParseError[] = [];
  const rows: ParsedProductRow[] = [];

  if (lines.length < 2) {
    return { platform: 'rakuten', rows: [], errors: [{ rowIndex: 0, message: 'CSVにデータ行がありません' }], totalRows: 0, skippedRows: 0 };
  }

  // ヘッダー行（最初の行）
  const headers = lines[0].map(h => h.trim());
  let skippedRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i];
    if (cols.length === 0 || cols.every(c => !c.trim())) {
      skippedRows++;
      continue;
    }

    const rawRow: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rawRow[h] = cols[idx]?.trim() ?? '';
    });

    const parsed: ParsedProductRow = { rawRow, rowIndex: i - 1 };

    for (const [colName, field] of Object.entries(COLUMN_MAP)) {
      const val = rawRow[colName];
      if (val === undefined || val === '') continue;

      if (field === '_images') {
        parsed.images = [val];
        // 乐天支持多张图：画像URL1～20
        for (let n = 2; n <= 20; n++) {
          const imgUrl = rawRow[`画像URL${n}`] ?? rawRow[`商品画像URL${n}`];
          if (imgUrl) parsed.images.push(imgUrl);
        }
      } else if (field === '_skip') {
        // 忽略
      } else if (field === 'platformPrice' || field === 'stock') {
        const num = parseInt(val.replace(/[,，]/g, ''), 10);
        if (!isNaN(num)) (parsed as unknown as Record<string, unknown>)[field] = num;
      } else if (field === 'platformSku') {
        parsed.platformSku = val;
        parsed.platformItemId = val; // 乐天以管理番号作为商品 ID
      } else {
        (parsed as unknown as Record<string, unknown>)[field] = val;
      }
    }

    if (!parsed.titleJa && !parsed.platformSku) {
      errors.push({ rowIndex: i - 1, message: '商品名と商品管理番号が両方空欄です', rawRow });
      skippedRows++;
      continue;
    }

    rows.push(parsed);
  }

  return {
    platform: 'rakuten',
    rows,
    errors,
    totalRows: lines.length - 1,
    skippedRows,
  };
}
