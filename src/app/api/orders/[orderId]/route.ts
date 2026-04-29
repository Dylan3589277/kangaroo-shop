import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { isAdminSession, toPublicOrder } from '@/lib/order-privacy';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = isAdminSession(session);

    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
      include: isAdmin ? { items: true, history: { orderBy: { createdAt: 'desc' } } } : { items: true },
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 管理员可查看完整订单；普通/未登录用户无法可靠证明归属，
    // 因此只返回公开结账/支付成功页所需的脱敏视图。
    return NextResponse.json({ order: isAdmin ? order : toPublicOrder(order) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
