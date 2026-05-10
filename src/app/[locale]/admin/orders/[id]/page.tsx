import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import StatusUpdateForm from './StatusUpdateForm';

type Props = {
  params: { locale: string; id: string };
};

async function getOrder(id: string) {
  try {
    return await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        history: { orderBy: { createdAt: 'desc' } },
      },
    });
  } catch {
    return null;
  }
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const { locale, id } = params;
  const order = await getOrder(id);

  if (!order) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
          Order not found
        </p>
        <Link href={`/${locale}/admin/orders`} style={{ color: 'var(--color-primary)' }}>
          ← Back to orders
        </Link>
      </div>
    );
  }

  const t = {
    ja: {
      title: '注文詳細',
      orderNumber: '注文番号',
      date: '注文日時',
      paymentMethod: '支払い方法',
      paymentStatus: 'ステータス',
      shipping: '配送先',
      items: '注文商品',
      subtotal: '小計',
      shippingFee: '送料',
      total: '合計',
      history: 'ステータス履歴',
      statusUpdate: 'ステータス更新',
      currentStatus: '現在ステータス',
      newStatus: '新しいステータス',
      note: 'メモ',
      optional: '任意',
      notePlaceholder: '変更理由など（任意）',
      update: '更新する',
      updating: '更新中...',
      successUpdate: '更新しました',
      errorUpdate: '更新に失敗しました',
      errorNoChange: '変更がありません',
      product: '商品',
      qty: '数量',
      price: '単価',
      noHistory: '履歴がありません',
      stripe: 'Stripe',
      paypal: 'PayPal',
    },
    zh: {
      title: '订单详情',
      orderNumber: '订单号',
      date: '下单时间',
      paymentMethod: '支付方式',
      paymentStatus: '状态',
      shipping: '收货地址',
      items: '商品明细',
      subtotal: '小计',
      shippingFee: '运费',
      total: '总计',
      history: '状态历史',
      statusUpdate: '状态更新',
      currentStatus: '当前状态',
      newStatus: '新状态',
      note: '备注',
      optional: '可选',
      notePlaceholder: '变更原因等（可选）',
      update: '更新',
      updating: '更新中...',
      successUpdate: '已更新',
      errorUpdate: '更新失败',
      errorNoChange: '没有变更',
      product: '商品',
      qty: '数量',
      price: '单价',
      noHistory: '暂无记录',
      stripe: 'Stripe',
      paypal: 'PayPal',
    },
    en: {
      title: 'Order Detail',
      orderNumber: 'Order #',
      date: 'Date',
      paymentMethod: 'Payment',
      paymentStatus: 'Status',
      shipping: 'Shipping',
      items: 'Items',
      subtotal: 'Subtotal',
      shippingFee: 'Shipping',
      total: 'Total',
      history: 'Status History',
      statusUpdate: 'Status Update',
      currentStatus: 'Current Status',
      newStatus: 'New Status',
      note: 'Note',
      optional: 'optional',
      notePlaceholder: 'Reason for change (optional)',
      update: 'Update',
      updating: 'Updating...',
      successUpdate: 'Updated',
      errorUpdate: 'Update failed',
      errorNoChange: 'No changes',
      product: 'Product',
      qty: 'Qty',
      price: 'Unit Price',
      noHistory: 'No history',
      stripe: 'Stripe',
      paypal: 'PayPal',
    },
  };

  const labels = t[locale as keyof typeof t] || t.ja;

  const statusLabels: Record<string, Record<string, string>> = {
    ja: {
      pending: '支払い待ち',
      paid: '支払い済み',
      failed: '失敗',
      cancelled: 'キャンセル',
      refunded: '返金済み',
    },
    zh: {
      pending: '待支付',
      paid: '已支付',
      failed: '失败',
      cancelled: '已取消',
      refunded: '已退款',
    },
    en: {
      pending: 'Pending',
      paid: 'Paid',
      failed: 'Failed',
      cancelled: 'Cancelled',
      refunded: 'Refunded',
    },
  };

  const getStatusLabel = (s: string) => statusLabels[locale]?.[s] || s;

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'paid': return { bg: '#dcfce7', color: '#16a34a' };
      case 'failed': return { bg: '#fef2f2', color: '#dc2626' };
      case 'cancelled': return { bg: '#f3f4f6', color: '#6b7280' };
      case 'refunded': return { bg: '#ede9fe', color: '#7c3aed' };
      default: return { bg: '#fef9c3', color: '#ca8a04' };
    }
  };

  const formatPrice = (yen: number) => `¥${yen.toLocaleString()}`;

  const formatDate = (date: Date) =>
    new Date(date).toLocaleString(
      locale === 'ja' ? 'ja-JP' : locale === 'zh' ? 'zh-CN' : 'en-US'
    );

  const formatHistoryDate = (date: Date) =>
    new Date(date).toLocaleString(
      locale === 'ja' ? 'ja-JP' : locale === 'zh' ? 'zh-CN' : 'en-US',
      { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    );

  const sc = getStatusColor(order.paymentStatus);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link
          href={`/${locale}/admin/orders`}
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-muted)',
            textDecoration: 'none',
            marginBottom: 'var(--space-2)',
            display: 'inline-block',
          }}
        >
          ← {locale === 'ja' ? '注文一覧へ戻る' : locale === 'zh' ? '返回订单列表' : '← Back to Orders'}
        </Link>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{labels.title}</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

          {/* 基本信息 */}
          <div style={cardStyle}>
            <h2 style={{ ...sectionTitle, marginBottom: 'var(--space-4)' }}>
              {locale === 'ja' ? '注文情報' : locale === 'zh' ? '订单信息' : 'Order Info'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <InfoRow label={labels.orderNumber} value={
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{order.orderNumber}</span>
              } />
              <InfoRow label={labels.date} value={formatDate(order.createdAt)} />
              <InfoRow label={labels.paymentMethod} value={
                order.paymentMethod === 'stripe' ? labels.stripe : labels.paypal
              } />
              <InfoRow label={labels.paymentStatus} value={
                <span style={{
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: '999px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 500,
                  background: sc.bg,
                  color: sc.color,
                }}>
                  {getStatusLabel(order.paymentStatus)}
                </span>
              } />
            </div>
          </div>

          {/* 商品明细 */}
          <div style={cardStyle}>
            <h2 style={{ ...sectionTitle, marginBottom: 'var(--space-4)' }}>{labels.items}</h2>
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={thStyle}>{labels.product}</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>{labels.qty}</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>{labels.price}</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>計</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={item.id} style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 500 }}>{item.productTitle}</div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>×{item.quantity}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{formatPrice(item.price)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500 }}>
                      {formatPrice(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* 金额汇总 */}
            <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{labels.subtotal}</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{labels.shippingFee}</span>
                <span>{formatPrice(order.shippingFee)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                <span>{labels.total}</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* 收货地址 */}
          <div style={cardStyle}>
            <h2 style={{ ...sectionTitle, marginBottom: 'var(--space-4)' }}>{labels.shipping}</h2>
            <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.8 }}>
              <p><strong>{order.shippingName}</strong></p>
              <p style={{ color: 'var(--color-text-secondary)' }}>{order.shippingPostal} {order.shippingPrefecture}{order.shippingCity}</p>
              <p style={{ color: 'var(--color-text-secondary)' }}>{order.shippingAddress1}{order.shippingAddress2 ? ` ${order.shippingAddress2}` : ''}</p>
              <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
                📞 {order.shippingPhone || '—'} &nbsp; 📧 {order.shippingEmail || '—'}
              </p>
            </div>
          </div>

          {/* 状态历史 */}
          <div style={cardStyle}>
            <h2 style={{ ...sectionTitle, marginBottom: 'var(--space-4)' }}>{labels.history}</h2>
            {order.history.length === 0 ? (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{labels.noHistory}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {order.history.map((h) => {
                  const hsc = getStatusColor(h.toStatus);
                  return (
                    <div key={h.id} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: hsc.color,
                        marginTop: '4px',
                        flexShrink: 0,
                      }} />
                      <div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                          <span style={{
                            padding: '1px 8px',
                            borderRadius: '999px',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 500,
                            background: hsc.bg,
                            color: hsc.color,
                          }}>
                            {getStatusLabel(h.toStatus)}
                          </span>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                            {formatHistoryDate(h.createdAt)}
                          </span>
                        </div>
                        {h.note && (
                          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                            {h.note}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right column - Status update form */}
        <div style={cardStyle}>
          <h2 style={{ ...sectionTitle, marginBottom: 'var(--space-4)' }}>{labels.statusUpdate}</h2>
          <StatusUpdateForm
            orderId={order.id}
            locale={locale}
            currentStatus={order.paymentStatus}
            t={labels}
          />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '2px' }}>{label}</p>
      <div style={{ fontSize: 'var(--text-sm)' }}>{value}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-6)',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 'var(--text-base)',
  fontWeight: 600,
  color: 'var(--color-text)',
};

const thStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-2)',
  textAlign: 'left',
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
};

const tdStyle: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-2)',
  fontSize: 'var(--text-sm)',
};
