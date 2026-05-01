import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { getPayableOrder, PaymentOrderError } from '@/lib/payment-order';
import { serverError } from '@/lib/api-error';
import { parseRequestJsonObject } from '@/lib/request-json';

// 强制使用 Node.js Runtime（Edge Runtime 有网络限制）
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const parsedBody = await parseRequestJsonObject(req);
    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const { locale, orderId } = parsedBody.data as { locale?: string; orderId?: unknown };
    const order = await getPayableOrder(orderId);

    if (order.paymentMethod !== 'stripe') {
      return NextResponse.json({ error: 'Order payment method is not stripe' }, { status: 400 });
    }

    const stripe = getStripe();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: order.total,
      currency: 'jpy',
      automatic_payment_methods: { enabled: true },
      metadata: {
        locale: locale ?? 'ja',
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentIntentId: paymentIntent.id },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    if (err instanceof PaymentOrderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    return serverError(err);
  }
}
