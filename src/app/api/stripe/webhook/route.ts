import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { isEmailConfigured, sendOrderConfirmation } from '@/lib/email';

// 强制 Node.js Runtime
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-03-25.dahlia' });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.orderId;
      console.log('[Stripe Webhook] Payment succeeded:', pi.id, 'orderId:', orderId);
      if (orderId) {
        // Security: verify this PaymentIntent belongs to this order
        const existingOrder = await prisma.order.findUnique({ where: { id: orderId } });
        if (!existingOrder || existingOrder.stripePaymentIntentId !== pi.id) {
          console.warn('[Stripe Webhook] PaymentIntent mismatch, rejecting:', pi.id, 'for order:', orderId);
          return NextResponse.json({ error: 'PaymentIntent does not belong to this order' }, { status: 400 });
        }
        const order = await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'paid',
            stripePaymentIntentId: pi.id,
          },
          include: { items: true },
        });
        await prisma.orderStatusHistory.create({
          data: {
            orderId,
            fromStatus: 'pending',
            toStatus: 'paid',
            note: 'Stripe payment confirmed via webhook',
          },
        });

        // 发送订单确认邮件
        if (isEmailConfigured() && order.shippingEmail) {
          try {
            await sendOrderConfirmation({
              orderNumber: order.orderNumber,
              customerName: order.shippingName ?? 'Customer',
              customerEmail: order.shippingEmail,
              total: Number(order.total),
              subtotal: Number(order.subtotal),
              shippingFee: Number(order.shippingFee),
              paymentMethod: 'stripe',
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
            console.log(`[Stripe Webhook] Confirmation email sent for order ${order.orderNumber}`);
          } catch (emailErr) {
            console.error(`[Stripe Webhook] Failed to send confirmation email for order ${order.orderNumber}:`, emailErr);
          }
        }
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.orderId;
      console.log('[Stripe Webhook] Payment failed:', pi.id, 'orderId:', orderId);
      if (orderId) {
        // Security: verify this PaymentIntent belongs to this order
        const existingOrder = await prisma.order.findUnique({ where: { id: orderId } });
        if (!existingOrder || existingOrder.stripePaymentIntentId !== pi.id) {
          console.warn('[Stripe Webhook] PaymentIntent mismatch, rejecting:', pi.id, 'for order:', orderId);
          return NextResponse.json({ error: 'PaymentIntent does not belong to this order' }, { status: 400 });
        }
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'failed',
            stripePaymentIntentId: pi.id,
          },
        });
      }
      break;
    }
    default:
      console.log('[Stripe Webhook] Unhandled event type:', event.type);
  }

  return NextResponse.json({ received: true });
}
