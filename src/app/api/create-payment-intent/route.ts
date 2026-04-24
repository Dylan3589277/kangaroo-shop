import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

// 强制使用 Node.js Runtime（Edge Runtime 有网络限制）
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { amount, currency = 'jpy', locale, orderId } = await req.json();
    const stripe = getStripe();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        locale: locale ?? 'ja',
        orderId: orderId ?? '',
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
