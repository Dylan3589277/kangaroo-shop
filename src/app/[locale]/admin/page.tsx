import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getStats() {
  try {
    const [orderCount, productCount, paidOrders, recentOrders] = await Promise.all([
      prisma.order.count(),
      prisma.product.count(),
      prisma.order.findMany({
        where: { paymentStatus: 'paid' },
        select: { total: true },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { items: true },
      }),
    ]);

    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);

    return { orderCount, productCount, totalRevenue, recentOrders };
  } catch {
    return null;
  }
}

export default async function AdminDashboard({ params }: { params: { locale: string } }) {
  const stats = await getStats();
  const locale = params.locale;

  const formatPrice = (yen: number) => {
    return `¥${yen.toLocaleString()}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(locale === 'ja' ? 'ja-JP' : locale === 'zh' ? 'zh-CN' : 'en-US');
  };

  const statusLabels: Record<string, { ja: string; zh: string; en: string }> = {
    pending: { ja: '支払い待ち', zh: '待支付', en: 'Pending' },
    paid: { ja: '支払い済み', zh: '已支付', en: 'Paid' },
    failed: { ja: '失敗', zh: '失败', en: 'Failed' },
  };

  const getStatusLabel = (status: string) => {
    return statusLabels[status]?.[locale as keyof typeof statusLabels[string]] || status;
  };

  return (
    <div>
      <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>
        {locale === 'ja' ? 'ダッシュボード' : locale === 'zh' ? '管理后台' : 'Dashboard'}
      </h1>

      {/* 统计卡片 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-8)',
      }}>
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
        }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
            {locale === 'ja' ? '総注文数' : locale === 'zh' ? '订单总数' : 'Total Orders'}
          </p>
          <p style={{ fontSize: 'var(--text-3xl)', fontWeight: 700 }}>
            {stats?.orderCount ?? '—'}
          </p>
        </div>

        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
        }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
            {locale === 'ja' ? '総商品数' : locale === 'zh' ? '商品总数' : 'Total Products'}
          </p>
          <p style={{ fontSize: 'var(--text-3xl)', fontWeight: 700 }}>
            {stats?.productCount ?? '—'}
          </p>
        </div>

        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
        }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
            {locale === 'ja' ? '総売上' : locale === 'zh' ? '总收入' : 'Total Revenue'}
          </p>
          <p style={{ fontSize: 'var(--text-3xl)', fontWeight: 700 }}>
            {stats ? formatPrice(stats.totalRevenue) : '—'}
          </p>
        </div>
      </div>

      {/* 最近订单 */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: 'var(--space-4) var(--space-6)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>
            {locale === 'ja' ? '最近注文' : locale === 'zh' ? '最近订单' : 'Recent Orders'}
          </h2>
          <a href={`/${locale}/admin/orders`} style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-primary)',
            textDecoration: 'none',
          }}>
            {locale === 'ja' ? 'すべて見る →' : locale === 'zh' ? '查看全部 →' : 'View all →'}
          </a>
        </div>

        {stats === null ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            {locale === 'ja' ? 'データベースに接続できません' : locale === 'zh' ? '无法连接数据库' : 'Cannot connect to database'}
          </div>
        ) : stats.recentOrders.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            {locale === 'ja' ? '注文がありません' : locale === 'zh' ? '暂无订单' : 'No orders yet'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-alt)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  {locale === 'ja' ? '注文番号' : locale === 'zh' ? '订单号' : 'Order #'}
                </th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  {locale === 'ja' ? '日時' : locale === 'zh' ? '日期' : 'Date'}
                </th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  {locale === 'ja' ? '金額' : locale === 'zh' ? '金额' : 'Amount'}
                </th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  {locale === 'ja' ? 'ステータス' : locale === 'zh' ? '状态' : 'Status'}
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((order, i) => (
                <tr key={order.id} style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', fontFamily: 'monospace' }}>
                    {order.orderNumber}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    {formatDate(order.createdAt)}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                    {formatPrice(order.total)}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 500,
                      background: order.paymentStatus === 'paid' ? '#dcfce7' : order.paymentStatus === 'failed' ? '#fef2f2' : '#fef9c3',
                      color: order.paymentStatus === 'paid' ? '#16a34a' : order.paymentStatus === 'failed' ? '#dc2626' : '#ca8a04',
                    }}>
                      {getStatusLabel(order.paymentStatus)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
