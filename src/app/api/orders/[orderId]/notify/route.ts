import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isEmailConfigured,
  sendOrderConfirmation,
  sendStatusChangeEmail,
} from '@/lib/email';
import { requireAdminSession } from '@/lib/admin-auth';

export const runtime = 'nodejs';

// POST /api/orders/[orderId]/notify
// body: { type: 'confirmation' | 'status_change', note?: string }
// 管理员才能发送通知邮件
export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { response } = await requireAdminSession();
    if (response) return response;

    const body = await req.json().catch(() => ({}));
    const { type, note, oldStatus = 'pending' } = body;

    if (!['confirmation', 'status_change'].includes(type)) {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
      include: { items: true },
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!order.shippingEmail) {
      return NextResponse.json({ error: 'No customer email on this order' }, { status: 400 });
    }

    if (!isEmailConfigured()) {
      return NextResponse.json({
        success: true,
        message: `Email ${type} queued (SMTP not configured)`,
        orderNumber: order.orderNumber,
        configured: false,
      });
    }

    if (type === 'confirmation') {
      await sendOrderConfirmation({
        orderNumber: order.orderNumber,
        customerName: order.shippingName ?? 'Customer',
        customerEmail: order.shippingEmail,
        total: Number(order.total),
        subtotal: Number(order.subtotal),
        shippingFee: Number(order.shippingFee),
        paymentMethod: order.paymentMethod as 'stripe' | 'paypal',
        items: order.items.map((item) => ({
          productTitle: item.productTitle,
          quantity: item.quantity,
          price: Number(item.price),
        })),
        shippingName: order.shippingName ?? 'Customer',
        shippingPostal: order.shippingPostal ?? '',
        shippingPrefecture: order.shippingPrefecture ?? '',
        shippingCity: order.shippingCity ?? '',
        shippingAddress1: order.shippingAddress1 ?? '',
        shippingAddress2: order.shippingAddress2 ?? undefined,
        shippingPhone: order.shippingPhone ?? undefined,
      });
    } else if (type === 'status_change') {
      await sendStatusChangeEmail({
        orderNumber: order.orderNumber,
        customerEmail: order.shippingEmail,
        customerName: order.shippingName ?? 'Customer',
        oldStatus,
        newStatus: order.paymentStatus,
        note,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Email ${type} sent`,
      orderNumber: order.orderNumber,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
