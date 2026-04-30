import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serverError } from '@/lib/api-error';
import { validatePaypalCaptureData } from '@/lib/paypal-capture-validation';

// 强制 Node.js Runtime
export const runtime = 'nodejs';

// 根据环境变量返回 PayPal API 基础 URL
function getPaypalBaseUrl(): string {
  const env = process.env.PAYPAL_ENVIRONMENT;
  if (env === 'live' || env === 'production') {
    return 'https://api-m.paypal.com';
  }
  return 'https://api-m.sandbox.paypal.com';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getEncodedPaypalCredentials(): string | null {
  const clientId = process.env.PAYPAL_CLIENT_ID ?? '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET ?? '';

  if (!clientId || !clientSecret) return null;

  // 清理换行符
  const cleanClientId = clientId.replace(/[\n\r]/g, '');
  const cleanClientSecret = clientSecret.replace(/[\n\r]/g, '');
  return Buffer.from(cleanClientId + ':' + cleanClientSecret).toString('base64');
}

async function fetchPaypalAccessToken(encodedCredentials: string): Promise<string | NextResponse> {
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

  const { access_token } = await tokenRes.json() as { access_token?: string };
  if (!access_token) {
    return NextResponse.json({ error: 'PayPal token response missing access_token' }, { status: 502 });
  }

  return access_token;
}

async function getValidatedPaypalOrder(
  paypalOrderId: string,
  accessToken: string,
  expected: { orderId: string; total: number }
): Promise<{ ok: true; paypalStatus: string | undefined } | { ok: false; response: NextResponse }> {
  const orderRes = await fetch(`${getPaypalBaseUrl()}/v2/checkout/orders/${paypalOrderId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken,
    },
  });

  if (!orderRes.ok) {
    const errText = await orderRes.text();
    return { ok: false, response: NextResponse.json({ error: 'PayPal order lookup error: ' + errText }, { status: 502 }) };
  }

  const orderData = await orderRes.json();
  const validation = validatePaypalCaptureData(orderData, {
    orderId: expected.orderId,
    paypalOrderId,
    total: expected.total,
  });

  if (!validation.valid) {
    return { ok: false, response: NextResponse.json({ error: validation.error }, { status: 400 }) };
  }

  return { ok: true, paypalStatus: validation.paypalStatus };
}

/**
 * PayPal 支付完成后回调此接口
 * 前端从 PayPal return_url 回来时，带着 token（PayPal Order ID）
 * 我们用 token 去 PayPal 确认 payment 是否成功，然后更新订单状态
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId, paypalOrderId } = await req.json();

    // 没有 token = 用户在 PayPal 侧取消了支付
    if (!paypalOrderId) {
      if (isNonEmptyString(orderId)) {
        const existing = await prisma.order.findUnique({ where: { id: orderId } });
        if (existing && existing.paymentMethod === 'paypal' && existing.paymentStatus !== 'paid') {
          await prisma.order.update({
            where: { id: orderId },
            data: { paymentStatus: 'cancelled' },
          });
          await prisma.orderStatusHistory.create({
            data: { orderId, fromStatus: existing.paymentStatus, toStatus: 'cancelled', note: 'Cancelled via PayPal' },
          });
        }
      }
      return NextResponse.json({ success: false, reason: 'cancelled' }, { status: 200 });
    }

    if (!isNonEmptyString(orderId) || !isNonEmptyString(paypalOrderId)) {
      return NextResponse.json({ error: 'orderId and paypalOrderId are required' }, { status: 400 });
    }

    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (existing.paymentMethod !== 'paypal') {
      return NextResponse.json({ error: 'Order payment method is not paypal' }, { status: 400 });
    }

    if (existing.paypalOrderId !== paypalOrderId) {
      return NextResponse.json({ error: 'PayPal order does not belong to this order' }, { status: 400 });
    }

    if (existing.paymentStatus === 'paid') {
      return NextResponse.json({ success: true, paypalStatus: 'COMPLETED', orderId });
    }

    if (existing.paymentStatus === 'cancelled' || existing.paymentStatus === 'refunded') {
      return NextResponse.json({ error: `Order payment status is not capturable: ${existing.paymentStatus}` }, { status: 400 });
    }

    const encodedCredentials = getEncodedPaypalCredentials();
    if (!encodedCredentials) {
      return NextResponse.json({ error: 'PayPal credentials not configured' }, { status: 500 });
    }

    const tokenResult = await fetchPaypalAccessToken(encodedCredentials);
    if (tokenResult instanceof NextResponse) return tokenResult;
    const accessToken = tokenResult;

    // 捕获 PayPal 订单（完成支付）
    const captureRes = await fetch(`${getPaypalBaseUrl()}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + accessToken,
      },
    });

    let paypalStatus: string | undefined;

    if (captureRes.ok) {
      const captureData = await captureRes.json();
      const validation = validatePaypalCaptureData(captureData, {
        orderId,
        paypalOrderId,
        total: existing.total,
      });

      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      paypalStatus = validation.paypalStatus; // COMPLETED, PENDING, etc.
      const localStatus: 'paid' | 'pending' = paypalStatus === 'COMPLETED' ? 'paid' : 'pending';

      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: localStatus, paypalOrderId },
      });
      await prisma.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: existing.paymentStatus,
          toStatus: localStatus,
          note: 'PayPal capture confirmed',
        },
      });

      return NextResponse.json({
        success: paypalStatus === 'COMPLETED',
        paypalStatus,
        orderId,
      });
    }

    // captureRes.ok === false：处理错误
    let errBody = '';
    try {
      errBody = await captureRes.text();
    } catch {
      return NextResponse.json({ error: 'PayPal capture failed with no body', paypalStatus }, { status: 502 });
    }

    // 幂等性：订单已经被 capture 过了，也必须再向 PayPal 拉取订单详情做归属/金额/币种校验
    try {
      const errObj = JSON.parse(errBody);
      if (errObj.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') {
        const validation = await getValidatedPaypalOrder(paypalOrderId, accessToken, {
          orderId,
          total: existing.total,
        });
        if (!validation.ok) return validation.response;

        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'paid', paypalOrderId },
        });
        await prisma.orderStatusHistory.create({
          data: {
            orderId,
            fromStatus: existing.paymentStatus,
            toStatus: 'paid',
            note: 'PayPal ORDER_ALREADY_CAPTURED (idempotent)',
          },
        });
        return NextResponse.json({ success: true, paypalStatus: validation.paypalStatus ?? 'COMPLETED', orderId });
      }
    } catch {
      // errBody 不是 JSON，继续走下面的通用错误处理
    }

    // 其他错误
    return NextResponse.json(
      { error: 'PayPal capture error: ' + errBody, paypalStatus },
      { status: 502 }
    );
  } catch (err) {
    return serverError(err);
  }
}
