/**
 * 邮件发送工具 — nodemailer + SMTP
 * 支持阿里云邮件推送等标准 SMTP 服务
 */

import nodemailer from 'nodemailer';
import { formatPrice } from '@/lib/products';

// 驼峰转 kebab-case（用于 CSS class 名）
function toKebabCase(str: string): string {
  return str.replace(/_/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
}

function sanitizeHeader(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/[\r\n]/g, ' ').trim();
}

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type EmailConfigStatus = {
  configured: boolean;
  missing: string[];
  hostSet: boolean;
  port: number;
  secure: boolean;
  userSet: boolean;
  fromSet: boolean;
};

export function getEmailConfigStatus(): EmailConfigStatus {
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  const missing = required.filter((name) => !process.env[name]);

  return {
    configured: missing.length === 0 && Number.isFinite(port),
    missing: Number.isFinite(port) ? missing : [...missing, 'SMTP_PORT'],
    hostSet: Boolean(process.env.SMTP_HOST),
    port: Number.isFinite(port) ? port : 465,
    secure: process.env.SMTP_SECURE === 'true',
    userSet: Boolean(process.env.SMTP_USER),
    fromSet: Boolean(process.env.SMTP_FROM),
  };
}

export type OrderData = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number; // 单位：JPY（实际日元整数，如 3200 = ¥3,200）
  subtotal: number;
  shippingFee: number;
  paymentMethod: 'stripe' | 'paypal';
  items: Array<{
    productTitle: string;
    quantity: number;
    price: number; // 单位：JPY
  }>;
  shippingName: string;
  shippingPostal: string;
  shippingPrefecture: string;
  shippingCity: string;
  shippingAddress1: string;
  shippingAddress2?: string;
  shippingPhone?: string;
};

export type StatusChangeData = {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  oldStatus: string;
  newStatus: string;
  note?: string;
};

// 创建邮件传输器
function createTransporter() {
  const config = getEmailConfigStatus();
  if (!config.configured) {
    throw new Error(`SMTP is not configured. Missing: ${config.missing.join(', ')}`);
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: config.port,
    secure: config.secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// 判断邮件服务是否已配置
export function isEmailConfigured(): boolean {
  return getEmailConfigStatus().configured;
}

// 发送订单确认邮件
export async function sendOrderConfirmation(order: OrderData): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn('[Email] SMTP not configured — skipping confirmation email');
    return;
  }

  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
          ${escapeHtml(item.productTitle)} × ${escapeHtml(item.quantity)}
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">
          ${formatPrice(item.price * item.quantity)}
        </td>
      </tr>`
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #FF6B35; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 20px; }
    .body { background: #fff; padding: 20px; border: 1px solid #eee; border-top: none; }
    .footer { background: #f9f9f9; padding: 15px 20px; border-radius: 0 0 8px 8px; border: 1px solid #eee; border-top: none; font-size: 12px; color: #888; }
    table { width: 100%; border-collapse: collapse; }
    .total-row { font-weight: bold; font-size: 16px; }
    .address { background: #f9f9f9; padding: 12px; border-radius: 6px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>classe — 注文確認</h1>
    </div>
    <div class="body">
      <p>${escapeHtml(order.customerName)} 様</p>
      <p>ご注文ありがとうございます。ご注文内容の確認です。</p>

      <h3 style="border-bottom: 2px solid #FF6B35; padding-bottom: 6px;">注文情報</h3>
      <p><strong>注文番号：</strong> ${escapeHtml(order.orderNumber)}</p>
      <p><strong>支払い方法：</strong> ${order.paymentMethod === 'stripe' ? 'Stripe（クレジットカード）' : 'PayPal'}</p>

      <h3 style="border-bottom: 2px solid #FF6B35; padding-bottom: 6px;">商品明细</h3>
      <table>
        ${itemsHtml}
        <tr><td colspan="2" style="padding: 8px 0;"></td></tr>
        <tr>
          <td style="padding: 4px 0;">小計</td>
          <td style="text-align: right;">${formatPrice(order.subtotal)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0;">送料</td>
          <td style="text-align: right;">${formatPrice(order.shippingFee)}</td>
        </tr>
        <tr class="total-row">
          <td style="padding: 8px 0;">合計</td>
          <td style="text-align: right;">${formatPrice(order.total)}</td>
        </tr>
      </table>

      <div class="address">
        <strong>配送先：</strong><br/>
        ${escapeHtml(order.shippingName)}<br/>
        〒${escapeHtml(order.shippingPostal)} ${escapeHtml(order.shippingPrefecture)}${escapeHtml(order.shippingCity)}<br/>
        ${escapeHtml(order.shippingAddress1)}${order.shippingAddress2 ? ` ${escapeHtml(order.shippingAddress2)}` : ''}<br/>
        ${order.shippingPhone ? `📞 ${escapeHtml(order.shippingPhone)}` : ''}
      </div>

      <p style="margin-top: 20px; font-size: 13px; color: #666;">
        ※ 本メールは自動送信です。ご質問がございましたら、本メールに返信ください。
      </p>
    </div>
    <div class="footer">
      classe — 全球好物，一站直达<br/>
      このメールはclasse公式オンラインストアより送信されました
    </div>
  </div>
</body>
</html>`;

  await createTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to: order.customerEmail,
    subject: `【classe】ご注文完了 — ${sanitizeHeader(order.orderNumber)}`,
    html,
  });
}

// 发送状态变更邮件
export async function sendStatusChangeEmail(data: StatusChangeData): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn('[Email] SMTP not configured — skipping status email');
    return;
  }

  const statusLabels: Record<string, string> = {
    pending: '支払い待ち',
    paid: '支払い済み',
    failed: '支払い失敗',
    cancelled: 'キャンセル',
    refunded: '返金済み',
  };

  const newLabel = statusLabels[data.newStatus] || data.newStatus;
  const oldLabel = statusLabels[data.oldStatus] || data.oldStatus;
  const oldStatusKebab = toKebabCase(data.oldStatus);
  const newStatusKebab = toKebabCase(data.newStatus);

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #FF6B35; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 20px; }
    .body { background: #fff; padding: 20px; border: 1px solid #eee; border-top: none; }
    .footer { background: #f9f9f9; padding: 15px 20px; border-radius: 0 0 8px 8px; border: 1px solid #eee; border-top: none; font-size: 12px; color: #888; }
    .status-box { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; }
    .status-paid { background: #dcfce7; color: #16a34a; }
    .status-pending { background: #fef9c3; color: #ca8a04; }
    .status-failed { background: #fef2f2; color: #dc2626; }
    .status-cancelled { background: #f3f4f6; color: #6b7280; }
    .status-refunded { background: #ede9fe; color: #7c3aed; }
    .note { background: #f9f9f9; padding: 12px; border-radius: 6px; margin-top: 16px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>classe — ステータス更新</h1>
    </div>
    <div class="body">
      <p>${escapeHtml(data.customerName)} 様</p>
      <p>ご注文 ${escapeHtml(data.orderNumber)} のステータスが更新されました。</p>

      <p><strong>注文番号：</strong> ${escapeHtml(data.orderNumber)}</p>

      <p>
        <strong>ステータス変更：</strong><br/>
        <span class="status-box status-${oldStatusKebab}">${escapeHtml(oldLabel)}</span>
        &nbsp;→&nbsp;
        <span class="status-box status-${newStatusKebab}">${escapeHtml(newLabel)}</span>
      </p>

      ${data.note ? `
      <div class="note">
        <strong>備考：</strong><br/>
        ${escapeHtml(data.note)}
      </div>
      ` : ''}

      <p style="margin-top: 20px; font-size: 13px; color: #666;">
        ※ 本メールは自動送信です。ご質問がございましたら、本メールに返信ください。
      </p>
    </div>
    <div class="footer">
      classe — 全球好物，一站直达
    </div>
  </div>
</body>
</html>`;

  await createTransporter().sendMail({
    from: process.env.SMTP_FROM,
    to: data.customerEmail,
    subject: `【classe】ご注文 ${sanitizeHeader(data.orderNumber)} ステータス更新 — ${sanitizeHeader(newLabel)}`,
    html,
  });
}
