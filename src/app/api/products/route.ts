import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET /api/products - 列表（支持分类筛选和搜索）
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '50', 10);
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const source = searchParams.get('source');

    const where: Record<string, unknown> = {};

    // category支持多选（逗号分隔如 brainrot,anime）
    if (category && category !== 'all') {
      const categories = category.split(',').map(c => c.trim()).filter(Boolean);
      if (categories.length === 1) {
        where.category = categories[0];
      } else if (categories.length > 1) {
        where.category = { in: categories };
      }
    }

    // 搜索
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { titleEn: { contains: search } },
        { titleJa: { contains: search } },
        { brand: { contains: search } },
      ];
    }

    // 价格范围
    if (minPrice || maxPrice) {
      const priceFilter: Record<string, number> = {};
      if (minPrice) priceFilter.gte = parseInt(minPrice, 10);
      if (maxPrice) priceFilter.lte = parseInt(maxPrice, 10);
      if (Object.keys(priceFilter).length > 0) where.price = priceFilter;
    }

    // 来源筛选
    if (source) {
      const sources = source.split(',').map(s => s.trim()).filter(Boolean);
      if (sources.length === 1) {
        where.source = sources[0];
      } else if (sources.length > 1) {
        where.source = { in: sources };
      }
    }

    const skip = (page - 1) * pageSize;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/products - 新增商品（仅管理员）
export async function POST() {
  return NextResponse.json({ error: 'Not implemented - use NestJS backend' }, { status: 501 });
}
