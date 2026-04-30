import { NextRequest, NextResponse } from 'next/server';
import { serverError } from '@/lib/api-error';
import { normalizeReviewPagination, validateReviewInput } from '@/lib/reviews';
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
    const { page, limit } = normalizeReviewPagination(
      searchParams.get('page'),
      searchParams.get('limit')
    );
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
  } catch (error) {
    return serverError(error);
  }
}

// POST /api/products/[id]/reviews — 提交评论
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const reviewInput = validateReviewInput(await request.json());

    if (!reviewInput.success) {
      return NextResponse.json({ error: reviewInput.error }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: {
        productId: id,
        authorName: reviewInput.data.authorName,
        rating: reviewInput.data.rating,
        title: reviewInput.data.title,
        content: reviewInput.data.content,
        isApproved: false,
      },
    });

    return NextResponse.json({
      message: 'Review submitted, pending approval',
      reviewId: review.id,
    }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
