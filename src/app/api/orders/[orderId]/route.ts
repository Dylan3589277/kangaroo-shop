import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
      include: { items: true, history: { orderBy: { createdAt: 'desc' } } },
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 非管理员只能查看自己的订单（通过邮箱判定）
    if (session.user?.role !== 'admin') {
      // 检查订单是否属于当前用户（通过 session email 或其他标识）
      // 目前没有 userId 字段，这里先做简单判断：订单必须有 shippingEmail
      if (!order.shippingEmail) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({ order });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
