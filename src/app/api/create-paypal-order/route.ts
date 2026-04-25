import { NextRequest, NextResponse } from 'next/server';

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
    const { amount, currency = 'JPY' } = await req.json();

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

    // JPY 无小数位，value 传整数
    const currencyCode = currency === 'jpy' ? 'JPY' : currency.toUpperCase();
    const value = currencyCode === 'JPY' ? String(Math.round(amount)) : (amount / 100).toFixed(2);

    const orderRes = await fetch(getPaypalBaseUrl() + '/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + access_token,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currencyCode,
            value,
          },
        }],
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      return NextResponse.json({ error: 'PayPal order error: ' + err }, { status: 502 });
    }

    const order = await orderRes.json();
    return NextResponse.json({ orderID: order.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
