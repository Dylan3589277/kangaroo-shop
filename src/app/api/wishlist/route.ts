import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const SESSION_COOKIE = 'wishlist_session';

// Simple validation without Zod (not installed)
function validateProductId(productId: unknown): productId is string {
  return typeof productId === 'string' && productId.length > 0;
}

// GET /api/wishlist — 获取当前用户的心愿单
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get(SESSION_COOKIE)?.value || '';
    if (!sessionId) {
      return NextResponse.json({ items: [], total: 0 });
    }

    const items = await prisma.wishlist.findMany({
      where: { sessionId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      items: items.map(i => ({
        id: i.id,
        productId: i.productId,
        product: i.product,
        addedAt: i.createdAt,
      })),
      total: items.length,
    });
  } catch (error) {
    console.error('[Wishlist GET]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/wishlist — 添加商品到心愿单
export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json();

    // Validate productId
    if (!validateProductId(productId)) {
      return NextResponse.json({ error: 'Invalid productId' }, { status: 400 });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    let sessionId = request.cookies.get(SESSION_COOKIE)?.value;

    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }

    // 检查是否已存在
    const existing = await prisma.wishlist.findUnique({
      where: { sessionId_productId: { sessionId, productId } },
    });

    if (existing) {
      return NextResponse.json({ message: 'Already in wishlist', id: existing.id });
    }

    const item = await prisma.wishlist.create({
      data: { sessionId, productId },
      include: { product: true },
    });

    const response = NextResponse.json({ message: 'Added to wishlist', id: item.id, product: item.product });
    if (!request.cookies.get(SESSION_COOKIE)) {
      response.cookies.set(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30天
      });
    }
    return response;
  } catch (error) {
    console.error('[Wishlist POST]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/wishlist — 从心愿单移除商品
export async function DELETE(request: NextRequest) {
  try {
    const { productId } = await request.json();

    // Validate productId
    if (!validateProductId(productId)) {
      return NextResponse.json({ error: 'Invalid productId' }, { status: 400 });
    }

    const sessionId = request.cookies.get(SESSION_COOKIE)?.value || '';

    if (!sessionId) {
      return NextResponse.json({ message: 'No wishlist' });
    }

    const result = await prisma.wishlist.deleteMany({
      where: { sessionId, productId },
    });

    if (result.count === 0) {
      return NextResponse.json({ message: 'Item not found in wishlist' });
    }

    return NextResponse.json({ message: 'Removed from wishlist' });
  } catch (error) {
    console.error('[Wishlist DELETE]', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
