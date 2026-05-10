import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import type { Prisma } from '@prisma/client';

type Props = {
  params: { locale: string };
  searchParams: { status?: string; page?: string; search?: string };
};

const STATUS_OPTIONS = ['pending', 'paid', 'failed', 'cancelled', 'refunded'] as const;

const PAGE_SIZE = 20;

async function getOrders(status: string | undefined, page: number, search: string | undefined) {
  try {
    const where: Prisma.OrderWhereInput = {};

    if (status) {
      where.paymentStatus = status;
    }

    // 搜索：支持订单号或邮箱模糊匹配
    if (search?.trim()) {
      const term = search.trim();
      where.OR = [
        { orderNumber: { contains: term, mode: 'insensitive' } },
        { shippingEmail: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { items: true },
      }),
      prisma.order.count({ where }),
    ]);
    return { orders, total, totalPages: Math.ceil(total / PAGE_SIZE) };
  } catch {
    return { orders: [], total: 0, totalPages: 0 };
  }
}

export default async function AdminOrdersPage({ params, searchParams }: Props) {
  const locale = params.locale;
  const currentStatus = searchParams.status;
  const currentPage = Math.max(1, parseInt(searchParams.page || '1', 10));
  const search = searchParams.search;

  const { orders, total, totalPages } = await getOrders(currentStatus, currentPage, search);

  const t = {
    ja: {
      title: '注文管理',
      orderNumber: '注文番号',
      date: '日時',
      customer: 'お客様',
      amount: '金額',
      status: 'ステータス',
      items: '商品数',
      action: '詳細',
      all: 'すべて',
      noOrders: '注文がありません',
      page: 'ページ',
      prev: '前へ',
      next: '次へ',
      searchPlaceholder: '注文番号またはメールで検索...',
      searchResult: (term: string, count: number) => `「${term}」の検索結果：${count}件`,
    },
    zh: {
      title: '订单管理',
      orderNumber: '订单号',
      date: '日期',
      customer: '客户',
      amount: '金额',
      status: '状态',
      items: '商品数',
      action: '详情',
      all: '全部',
      noOrders: '暂无订单',
      page: '页',
      prev: '上一页',
      next: '下一页',
      searchPlaceholder: '搜索订单号或邮箱...',
      searchResult: (term: string, count: number) => `「${term}」搜索结果：${count} 条`,
    },
    en: {
      title: 'Orders',
      orderNumber: 'Order #',
      date: 'Date',
      customer: 'Customer',
      amount: 'Amount',
      status: 'Status',
      items: 'Items',
      action: 'View',
      all: 'All',
      noOrders: 'No orders yet',
      page: 'Page',
      prev: 'Prev',
      next: 'Next',
      searchPlaceholder: 'Search by order number or email...',
      searchResult: (term: string, count: number) => `"${term}" results: ${count}`,
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
    new Date(date).toLocaleDateString(
      locale === 'ja' ? 'ja-JP' : locale === 'zh' ? 'zh-CN' : 'en-US',
      { year: 'numeric', month: 'short', day: 'numeric' }
    );

  function buildUrl(status: string | undefined, page: number, keepSearch?: string) {
    const sp = new URLSearchParams();
    if (status) sp.set('status', status);
    if (page > 1) sp.set('page', String(page));
    const s = keepSearch ?? search;
    if (s) sp.set('search', s);
    const qs = sp.toString();
    return `/${locale}/admin/orders${qs ? '?' + qs : ''}`;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{labels.title}</h1>
      </div>

      {/* 搜索框 */}
      <form method="GET" action={`/${locale}/admin/orders`} style={{ marginBottom: 'var(--space-4)' }}>
        {currentStatus && <input type="hidden" name="status" value={currentStatus} />}
        <div style={{ display: 'flex', gap: 'var(--space-2)', maxWidth: '400px' }}>
          <input
            type="text"
            name="search"
            defaultValue={search || ''}
            placeholder={labels.searchPlaceholder}
            style={{
              flex: 1,
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: 'var(--text-sm)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
            }}
          />
          <button
            type="submit"
            style={{
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-primary)',
              background: 'var(--color-primary)',
              color: '#fff',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {locale === 'ja' ? '検索' : locale === 'zh' ? '搜索' : 'Search'}
          </button>
          {search && (
            <a
              href={buildUrl(currentStatus, 1, undefined)}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text-muted)',
                fontSize: 'var(--text-sm)',
                textDecoration: 'none',
              }}
            >
              ✕
            </a>
          )}
        </div>
        {search && (
          <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            {labels.searchResult(search, total)}
          </p>
        )}
      </form>

      {/* 状态筛选 */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <a
          href={buildUrl(undefined, 1)}
          style={{
            padding: '6px 14px',
            borderRadius: '999px',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            textDecoration: 'none',
            background: !currentStatus ? 'var(--color-primary)' : 'var(--color-surface)',
            color: !currentStatus ? '#fff' : 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
        >
          {labels.all}
        </a>
        {STATUS_OPTIONS.map((s) => (
          <a
            key={s}
            href={buildUrl(s, 1)}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              textDecoration: 'none',
              background: currentStatus === s ? 'var(--color-primary)' : 'var(--color-surface)',
              color: currentStatus === s ? '#fff' : 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {getStatusLabel(s)}
          </a>
        ))}
      </div>

      {/* 订单列表 */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        {orders.length === 0 ? (
          <div style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
              {labels.noOrders}
            </p>
            <a
              href={`/${locale}/admin/products`}
              style={{
                display: 'inline-block',
                padding: 'var(--space-2) var(--space-4)',
                background: 'var(--color-primary)',
                color: '#fff',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
              }}
            >
              {locale === 'ja' ? '商品管理へ' : locale === 'zh' ? '管理商品' : 'Manage Products'}
            </a>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-alt)' }}>
                  <th style={thStyle}>{labels.orderNumber}</th>
                  <th style={thStyle}>{labels.date}</th>
                  <th style={thStyle}>{labels.customer}</th>
                  <th style={thStyle}>{labels.items}</th>
                  <th style={thStyle}>{labels.amount}</th>
                  <th style={thStyle}>{labels.status}</th>
                  <th style={thStyle}>{labels.action}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, i) => {
                  const sc = getStatusColor(order.paymentStatus);
                  return (
                    <tr key={order.id} style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}>
                      <td style={tdStyle}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{order.orderNumber}</span>
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>
                        {formatDate(order.createdAt)}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>
                        {order.shippingName || '—'}
                        <br />
                        <span style={{ fontSize: 'var(--text-xs)' }}>{order.shippingEmail || ''}</span>
                      </td>
                      <td style={tdStyle}>{order.items.length}</td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{formatPrice(order.total)}</td>
                      <td style={tdStyle}>
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
                      </td>
                      <td style={tdStyle}>
                        <Link
                          href={`/${locale}/admin/orders/${order.id}`}
                          style={{
                            fontSize: 'var(--text-sm)',
                            color: 'var(--color-primary)',
                            textDecoration: 'none',
                            fontWeight: 500,
                          }}
                        >
                          {labels.action} →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* 分页 */}
            {totalPages > 1 && (
              <div style={{
                padding: 'var(--space-4) var(--space-6)',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  {labels.page} {currentPage} / {totalPages} ({total} 件)
                </span>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {currentPage > 1 && (
                    <a href={buildUrl(currentStatus, currentPage - 1)} style={pageBtnStyle}>
                      {labels.prev}
                    </a>
                  )}
                  {currentPage < totalPages && (
                    <a href={buildUrl(currentStatus, currentPage + 1)} style={pageBtnStyle}>
                      {labels.next}
                    </a>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  textAlign: 'left',
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
};

const tdStyle: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  fontSize: 'var(--text-sm)',
};

const pageBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-sm)',
  fontWeight: 500,
  textDecoration: 'none',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
};
