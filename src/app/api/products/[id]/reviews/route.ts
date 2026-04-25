import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// GET /api/products/[id]/reviews — 获取商品评论列表
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { productId: id, isApproved: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({ where: { productId: id, isApproved: true } }),
    ]);

    return NextResponse.json({ reviews, total, page, limit, pages: Math.ceil(total / limit) });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/products/[id]/reviews — 提交评论
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { authorName, rating, title, content } = await request.json();

    if (!authorName || !rating || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: {
        productId: id,
        authorName: authorName.trim(),
        rating: parseInt(rating),
        title: title?.trim() || null,
        content: content.trim(),
        isApproved: false,
      },
    });

    return NextResponse.json({
      message: 'Review submitted, pending approval',
      reviewId: review.id,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
