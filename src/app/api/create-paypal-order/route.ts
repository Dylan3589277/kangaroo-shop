import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPayableOrder, PaymentOrderError } from '@/lib/payment-order';
import { serverError } from '@/lib/api-error';
import { parseRequestJsonObject } from '@/lib/request-json';

// 强制使用 Node.js Runtime（解决 Edge Runtime 无法认证 PayPal 的问题）
export const runtime = 'nodejs';

// 根据环境变量返回 PayPal API 基础 URL
function getPaypalBaseUrl(): string {
  const env = process.env.PAYPAL_ENVIRONMENT;
  if (env === 'live' || env === 'production') {
    return 'https://api-m.paypal.com';
  }
  return 'https://api-m.sandbox.paypal.com';
}

export async function POST(req: NextRequest) {
  try {
    const parsedBody = await parseRequestJsonObject(req);
    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const { orderId } = parsedBody.data;
    const order = await getPayableOrder(orderId);

    if (order.paymentMethod !== 'paypal') {
      return NextResponse.json({ error: 'Order payment method is not paypal' }, { status: 400 });
    }

    const clientId = process.env.PAYPAL_CLIENT_ID ?? '';
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET ?? '';

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'PayPal credentials not configured' }, { status: 500 });
    }

    // 清理可能的换行符（Vercel 环境变量有时会带 \n）
    const cleanClientId = clientId.replace(/[\n\r]/g, '');
    const cleanClientSecret = clientSecret.replace(/[\n\r]/g, '');
    const encodedCredentials = Buffer.from(cleanClientId + ':' + cleanClientSecret).toString('base64');

    const tokenRes = await fetch(getPaypalBaseUrl() + '/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + encodedCredentials,
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return NextResponse.json({ error: 'PayPal token error: ' + errText }, { status: 502 });
    }

    const { access_token } = await tokenRes.json();

    // JPY 无小数位，金额只从服务端订单 total 获取，不信任前端 amount/currency
    const orderRes = await fetch(getPaypalBaseUrl() + '/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + access_token,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          custom_id: order.id,
          description: `classe order ${order.orderNumber}`,
          amount: {
            currency_code: 'JPY',
            value: String(order.total),
          },
        }],
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      return NextResponse.json({ error: 'PayPal order error: ' + err }, { status: 502 });
    }

    const paypalOrder = await orderRes.json();

    await prisma.order.update({
      where: { id: order.id },
      data: { paypalOrderId: paypalOrder.id },
    });

    return NextResponse.json({ orderID: paypalOrder.id });
  } catch (err) {
    if (err instanceof PaymentOrderError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    return serverError(err);
  }
}
