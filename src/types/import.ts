// ============================================
// 平台商品导入相关类型定义
// ============================================

export type ImportPlatform = 'rakuten' | 'amazon' | 'own';

/** 解析后的单行商品数据（统一格式，来源无关） */
export interface ParsedProductRow {
  /** 平台内商品 ID（乐天: 商品管理番号，Amazon: ASIN） */
  platformItemId?: string;
  /** 平台 SKU */
  platformSku?: string;
  /** 商品名（日文优先） */
  titleJa?: string;
  /** 商品名（英文） */
  titleEn?: string;
  /** 商品名（中文，通常为空） */
  titleZh?: string;
  /** 品牌 */
  brand?: string;
  /** 平台售价，单位：日元（整数） */
  platformPrice?: number;
  /** 库存 */
  stock?: number;
  /** 商品描述 */
  description?: string;
  /** 图片 URL 列表 */
  images?: string[];
  /** 商品分类 */
  category?: string;
  /** 平台商品页 URL */
  platformUrl?: string;
  /** 原始行数据（保留备查） */
  rawRow: Record<string, string>;
  /** 行序号（从 0 开始） */
  rowIndex: number;
}

/** CSV/TSV 解析结果 */
export interface ParseResult {
  platform: ImportPlatform;
  rows: ParsedProductRow[];
  errors: ParseError[];
  totalRows: number;
  skippedRows: number;
}

export interface ParseError {
  rowIndex: number;
  message: string;
  rawRow?: Record<string, string>;
}

/** Dry-run 预览：单行预期操作 */
export interface ImportPreviewItem {
  rowIndex: number;
  action: 'create' | 'update' | 'skip';
  reason?: string;
  platformSku?: string;
  titleJa?: string;
  platformPrice?: number;
  existingProductId?: string;
}

/** Dry-run 预览响应 */
export interface ImportPreviewResult {
  platform: ImportPlatform;
  fileName: string;
  totalRows: number;
  toCreate: number;
  toUpdate: number;
  toSkip: number;
  parseErrors: number;
  items: ImportPreviewItem[];
  /** 文件内容 SHA-256 摘要，用于执行前确认文件未被调包 */
  fileSha256: string;
  /** 预览确认令牌，执行导入时必须回传 */
  confirmationToken: string;
}

/** Execute 导入响应 */
export interface ImportExecuteResult {
  syncJobId: string;
  platform: ImportPlatform;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}
