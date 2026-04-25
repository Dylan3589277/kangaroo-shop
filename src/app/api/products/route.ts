import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://localhost:3001/api/v1/products';

// platform enum → source string
function platformToSource(platform: string): string {
  const map: Record<string, string> = {
    MERCARI: 'mercari',
    RAKUTEN: 'rakuten',
    AMAZON: 'amazon',
    ZOZO: 'zozotown',
    YODOBASHI: 'yodobashi',
    BICCAMERA: 'biccamera',
    YAMADA: 'yamada',
    NOJIMA: 'nojima',
    EHON: 'ehon',
    OWN: 'own',
  };
  return map[platform?.toUpperCase()] ?? 'own';
}

// NestJS product → Product interface
function transformProduct(p: Record<string, unknown>): Record<string, unknown> {
  return {
    id: p.id,
    title: p.titleZh ?? p.title ?? '',
    titleEn: p.titleEn ?? null,
    price: p.priceJpy ?? 0,
    originalPrice: null,
    currency: 'JPY',
    images: Array.isArray(p.images) ? p.images : [],
    category: typeof p.categoryId === 'string' ? p.categoryId : (p.category as string) ?? 'brainrot',
    source: platformToSource(p.platform as string),
    sourceUrl: p.platformUrl ?? null,
    rating: typeof p.rating === 'number' ? p.rating : 0,
    reviews: typeof p.reviewCount === 'number' ? p.reviewCount : 0,
    inStock: p.inStock !== false,
    description: p.descriptionZh ?? p.description ?? null,
    weight: 200,
  };
}

export const runtime = 'nodejs';

// GET /api/products - 列表（支持分类筛选和搜索）
// 转发到 NestJS 后端并转换数据格式
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // 透传查询参数到后端
    const query = searchParams.toString();
    const backendUrl = `${BACKEND_URL}${query ? `?${query}` : ''}`;

    const response = await fetch(backendUrl, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    // 转换数据格式：{ data: [...], pagination: {...} } → { products: [...], pagination: {...} }
    const products = Array.isArray(result.data)
      ? result.data.map(transformProduct)
      : [];

    return NextResponse.json({
      products,
      pagination: result.pagination ?? { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/products - 新增商品（仅管理员）
// 此接口暂不转发，保持原有 Prisma 实现或返回 501
export async function POST() {
  return NextResponse.json({ error: 'Not implemented - use NestJS backend' }, { status: 501 });
}
