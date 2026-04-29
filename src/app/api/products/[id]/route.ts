import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin-auth';

export const runtime = 'nodejs';

// GET /api/products/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const product = await prisma.product.findUnique({ where: { id: params.id } });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    return NextResponse.json({ product });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/products/[id] - 更新商品（仅管理员）
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { response } = await requireAdminSession();
    if (response) return response;

    const body = await req.json();
    const existing = await prisma.product.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const {
      title, titleEn, titleJa, brand,
      price, originalPrice, currency,
      images, category, source, sourceUrl,
      rating, reviews, inStock, stock, description, weight, isActive,
    } = body;

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(titleEn !== undefined && { titleEn }),
        ...(titleJa !== undefined && { titleJa }),
        ...(brand !== undefined && { brand }),
        ...(price !== undefined && { price }),
        ...(originalPrice !== undefined && { originalPrice }),
        ...(currency !== undefined && { currency }),
        ...(images !== undefined && { images }),
        ...(category !== undefined && { category }),
        ...(source !== undefined && { source }),
        ...(sourceUrl !== undefined && { sourceUrl }),
        ...(rating !== undefined && { rating }),
        ...(reviews !== undefined && { reviews }),
        ...(inStock !== undefined && { inStock }),
        ...(stock !== undefined && { stock }),
        ...(description !== undefined && { description }),
        ...(weight !== undefined && { weight }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ product });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/products/[id] - 软删除（仅管理员）
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { response } = await requireAdminSession();
    if (response) return response;

    const existing = await prisma.product.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
