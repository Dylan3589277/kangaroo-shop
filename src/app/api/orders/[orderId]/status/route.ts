import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';

const VALID_STATUSES = ['pending', 'paid', 'failed', 'cancelled', 'refunded'];

// 管理员才能更新订单状态
export async function PATCH(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - admin only' }, { status: 401 });
    }

    const { status, note } = await req.json();

    if (!status || !VALID_STATUSES.includes(status)) {
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
          note: note ?? null,
        },
      }),
    ]);

    return NextResponse.json({ order, history });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
