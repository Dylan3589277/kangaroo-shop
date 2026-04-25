import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';

// GET /api/products - 列表（支持分类筛选和搜索）
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '50', 10);

    const where: Record<string, unknown> = {};
    if (category && category !== 'all') {
      where.category = category;
    }
    // 防SQL注入：使用Prisma的contains进行模糊搜索
    if (search && search.trim()) {
      where.title = { contains: search.trim(), mode: 'insensitive' };
    }
    const activeParam = searchParams.get('active');
    if (activeParam !== null) {
      where.isActive = activeParam === 'true';
    } else {
      // 默认只查激活的（前台用）
      where.isActive = true;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/products - 新增商品（仅管理员）
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - admin only' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title, titleEn, price, originalPrice, currency = 'JPY',
      images = [], category = 'brainrot', source = 'own', sourceUrl,
      rating = 0, reviews = 0, inStock = true, stock = 0,
      description, weight = 200,
    } = body;

    if (!title || typeof price !== 'number') {
      return NextResponse.json({ error: 'title and price are required' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        title,
        titleEn: titleEn ?? null,
        price,
        originalPrice: originalPrice ?? null,
        currency,
        images,
        category,
        source,
        sourceUrl: sourceUrl ?? null,
        rating,
        reviews,
        inStock,
        stock,
        description: description ?? null,
        weight,
        isActive: true,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
