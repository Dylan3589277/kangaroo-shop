import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serverError } from '@/lib/api-error';
import { parseRequestJsonObject } from '@/lib/request-json';
import { validateWishlistProductId, WISHLIST_SESSION_COOKIE } from '@/lib/wishlist';

export const runtime = 'nodejs';

// GET /api/wishlist — 获取当前用户的心愿单
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get(WISHLIST_SESSION_COOKIE)?.value || '';
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
    return serverError(error);
  }
}

// POST /api/wishlist — 添加商品到心愿单
export async function POST(request: NextRequest) {
  try {
    const body = await parseRequestJsonObject(request);
    if (!body.success) {
      return body.response;
    }

    const { productId } = body.data;

    // Validate productId
    if (!validateWishlistProductId(productId)) {
      return NextResponse.json({ error: 'Invalid productId' }, { status: 400 });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    let sessionId = request.cookies.get(WISHLIST_SESSION_COOKIE)?.value;

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
    if (!request.cookies.get(WISHLIST_SESSION_COOKIE)) {
      response.cookies.set(WISHLIST_SESSION_COOKIE, sessionId, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30天
      });
    }
    return response;
  } catch (error) {
    return serverError(error);
  }
}

// DELETE /api/wishlist — 从心愿单移除商品
export async function DELETE(request: NextRequest) {
  try {
    const body = await parseRequestJsonObject(request);
    if (!body.success) {
      return body.response;
    }

    const { productId } = body.data;

    // Validate productId
    if (!validateWishlistProductId(productId)) {
      return NextResponse.json({ error: 'Invalid productId' }, { status: 400 });
    }

    const sessionId = request.cookies.get(WISHLIST_SESSION_COOKIE)?.value || '';

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
    return serverError(error);
  }
}
