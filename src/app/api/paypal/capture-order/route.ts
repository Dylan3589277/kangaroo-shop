import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serverError } from '@/lib/api-error';

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
      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'cancelled' },
        });
        await prisma.orderStatusHistory.create({
          data: { orderId, fromStatus: 'pending', toStatus: 'cancelled', note: 'Cancelled via PayPal' },
        });
      }
      return NextResponse.json({ success: false, reason: 'cancelled' }, { status: 200 });
    }

    const clientId = process.env.PAYPAL_CLIENT_ID ?? '';
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET ?? '';

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'PayPal credentials not configured' }, { status: 500 });
    }

    // 清理换行符
    const cleanClientId = clientId.replace(/[\n\r]/g, '');
    const cleanClientSecret = clientSecret.replace(/[\n\r]/g, '');
    const encodedCredentials = Buffer.from(cleanClientId + ':' + cleanClientSecret).toString('base64');

    // 获取 Access Token
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

    // 捕获 PayPal 订单（完成支付）
    const captureRes = await fetch(`${getPaypalBaseUrl()}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + access_token,
      },
    });

    let paypalStatus: string | undefined;

    if (captureRes.ok) {
      // 支付成功
      const captureData = await captureRes.json();
      paypalStatus = captureData.status; // COMPLETED, PENDING, etc.
      const localStatus: 'paid' | 'pending' = paypalStatus === 'COMPLETED' ? 'paid' : 'pending';

      if (orderId) {
        const existing = await prisma.order.findUnique({ where: { id: orderId } });
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: localStatus, paypalOrderId },
        });
        await prisma.orderStatusHistory.create({
          data: {
            orderId,
            fromStatus: existing?.paymentStatus ?? 'pending',
            toStatus: localStatus,
            note: 'PayPal capture confirmed',
          },
        });
      }

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

    // 幂等性：订单已经被 capture 过了
    try {
      const errObj = JSON.parse(errBody);
      if (errObj.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') {
        if (orderId) {
          const existing = await prisma.order.findUnique({ where: { id: orderId } });
          await prisma.order.update({
            where: { id: orderId },
            data: { paymentStatus: 'paid', paypalOrderId },
          });
          await prisma.orderStatusHistory.create({
            data: {
              orderId,
              fromStatus: existing?.paymentStatus ?? 'pending',
              toStatus: 'paid',
              note: 'PayPal ORDER_ALREADY_CAPTURED (idempotent)',
            },
          });
        }
        return NextResponse.json({ success: true, paypalStatus: 'COMPLETED', orderId });
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
