import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const SESSION_COOKIE = 'wishlist_session';

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
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/wishlist — 添加商品到心愿单
export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json();
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
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/wishlist — 从心愿单移除商品
export async function DELETE(request: NextRequest) {
  try {
    const { productId } = await request.json();
    const sessionId = request.cookies.get(SESSION_COOKIE)?.value || '';

    if (!sessionId) {
      return NextResponse.json({ message: 'No wishlist' });
    }

    await prisma.wishlist.deleteMany({
      where: { sessionId, productId },
    });

    return NextResponse.json({ message: 'Removed from wishlist' });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
