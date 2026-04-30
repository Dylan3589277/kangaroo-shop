import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin-auth';
import { serverError } from '@/lib/api-error';
import { parseRequestJsonObject } from '@/lib/request-json';

export const runtime = 'nodejs';

const VALID_STATUSES = ['pending', 'paid', 'failed', 'cancelled', 'refunded'];

// 管理员才能更新订单状态
export async function PATCH(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { response } = await requireAdminSession();
    if (response) return response;

    const parsedBody = await parseRequestJsonObject(req);
    if (!parsedBody.success) return parsedBody.response;

    const { status, note } = parsedBody.data;

    if (typeof status !== 'string' || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const existing = await prisma.order.findUnique({ where: { id: params.orderId } });
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const [order, history] = await prisma.$transaction([
      prisma.order.update({
        where: { id: params.orderId },
        data: { paymentStatus: status },
        include: { items: true },
      }),
      prisma.orderStatusHistory.create({
        data: {
          orderId: params.orderId,
          fromStatus: existing.paymentStatus,
          toStatus: status,
          note: (note ?? null) as string | null,
        },
      }),
    ]);

    return NextResponse.json({ order, history });
  } catch (err) {
    return serverError(err);
  }
}
