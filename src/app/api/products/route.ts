import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin-auth';
import { serverError } from '@/lib/api-error';
import { parseRequestJsonObject } from '@/lib/request-json';

export const runtime = 'nodejs';

// GET /api/products - 列表（支持分类筛选和搜索）
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const parsedPage = parseInt(searchParams.get('page') ?? '1', 10);
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    // 兼容 pageSize 和 limit 两种参数名，并限制最大分页，避免异常参数压垮数据库
    const parsedPageSize = parseInt(
      searchParams.get('pageSize') ?? searchParams.get('limit') ?? '50',
      10
    );
    const pageSize = Math.min(Math.max(Number.isFinite(parsedPageSize) ? parsedPageSize : 50, 1), 100);
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const source = searchParams.get('source');

    const where: Record<string, unknown> = { isActive: true };

    // category 支持多选（逗号分隔如 brainrot,anime）
    if (category && category !== 'all') {
      const categories = category.split(',').map(c => c.trim()).filter(Boolean);
      if (categories.length === 1) {
        where.category = categories[0];
      } else if (categories.length > 1) {
        where.category = { in: categories };
      }
    }

    // 搜索：仅使用 schema 中实际存在的字段
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { titleEn: { contains: search } },
        { titleJa: { contains: search } },
        { brand: { contains: search } },
        { description: { contains: search } },
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
    return serverError(err);
  }
}

// POST /api/products - 新增商品（仅管理员）
export async function POST(req: NextRequest) {
  try {
    const { response } = await requireAdminSession();
    if (response) return response;

    const parsed = await parseRequestJsonObject(req);
    if (!parsed.success) return parsed.response;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = parsed.data as Record<string, any>;
    const {
      title, titleEn, titleJa, brand,
      price, originalPrice, currency,
      images, category, source, sourceUrl,
      rating, reviews, inStock, stock, description, weight, isActive,
    } = body;

    if (!title || price === undefined) {
      return NextResponse.json({ error: 'title と price は必須です' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        title,
        titleEn: titleEn ?? null,
        titleJa: titleJa ?? null,
        brand: brand ?? null,
        price: Number(price),
        originalPrice: originalPrice != null ? Number(originalPrice) : null,
        currency: currency ?? 'JPY',
        images: images ?? [],
        category: category ?? 'brainrot',
        source: source ?? 'own',
        sourceUrl: sourceUrl ?? null,
        rating: rating != null ? Number(rating) : 0,
        reviews: reviews != null ? Number(reviews) : 0,
        inStock: inStock !== false,
        stock: stock != null ? Number(stock) : 0,
        description: description ?? null,
        weight: weight != null ? Number(weight) : 200,
        isActive: isActive !== false,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
