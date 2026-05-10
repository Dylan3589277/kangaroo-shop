'use client';

import { useMemo, useState } from 'react';
import {
  supportFaqItems,
  supportReplyTemplates,
  supportSafetyRules,
  supportStatusGuides,
  supportTicketSteps,
} from '@/lib/support-center-content';

type SupportOrderItem = {
  id: string;
  productId: string | null;
  productTitle: string;
  productImage: string | null;
  price: number;
  quantity: number;
  weight: number;
};

type SupportOrder = {
  id: string;
  orderNumber: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  originalSubtotal: number | null;
  total: number;
  courier: string;
  createdAt: string;
  updatedAt: string;
  maskedEmail: string | null;
  maskedPhone: string | null;
  addressSummary: {
    prefecture: string | null;
    city: string | null;
  };
  items: SupportOrderItem[];
};

type SupportOrdersResponse = {
  orders?: SupportOrder[];
  order?: SupportOrder;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  error?: string;
};

const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待支付' },
  { value: 'paid', label: '已支付' },
  { value: 'failed', label: '支付失败' },
  { value: 'cancelled', label: '已取消' },
  { value: 'refunded', label: '已退款' },
];

const statusLabels: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  failed: '支付失败',
  cancelled: '已取消',
  refunded: '已退款',
};

const statusColors: Record<string, { bg: string; color: string }> = {
  paid: { bg: '#dcfce7', color: '#166534' },
  pending: { bg: '#fef9c3', color: '#854d0e' },
  failed: { bg: '#fee2e2', color: '#991b1b' },
  cancelled: { bg: '#f3f4f6', color: '#374151' },
  refunded: { bg: '#ede9fe', color: '#5b21b6' },
};

function formatPrice(value: number) {
  return `¥${value.toLocaleString('ja-JP')}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusStyle(status: string) {
  return statusColors[status] ?? { bg: '#e0f2fe', color: '#075985' };
}

function normalizeQuery(input: string) {
  return input.trim();
}

export function SupportCenterClient() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [orders, setOrders] = useState<SupportOrder[]>([]);
  const [pagination, setPagination] = useState<SupportOrdersResponse['pagination']>();
  const [selectedOrder, setSelectedOrder] = useState<SupportOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('输入订单号或邮箱后点击查询；也可以不输入关键词查看最近订单。');
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  const totalItems = useMemo(() => orders.reduce((sum, order) => sum + order.items.length, 0), [orders]);

  async function searchOrders(page = 1) {
    const q = normalizeQuery(query);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (q) params.set(q.startsWith('KS') ? 'orderNumber' : 'q', q);
    if (status !== 'all') params.set('status', status);

    setLoading(true);
    setMessage('正在查询，请稍候…');
    setSelectedOrder(null);

    try {
      const response = await fetch(`/api/admin/support/orders?${params.toString()}`, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      const body = (await response.json()) as SupportOrdersResponse;

      if (!response.ok) {
        setOrders([]);
        setPagination(undefined);
        setMessage(body.error ?? `查询失败：${response.status}`);
        return;
      }

      const nextOrders = body.order ? [body.order] : body.orders ?? [];
      setOrders(nextOrders);
      setPagination(body.pagination ?? (body.order ? { page: 1, pageSize: 1, total: 1, totalPages: 1 } : undefined));
      setMessage(nextOrders.length > 0 ? `已找到 ${body.pagination?.total ?? nextOrders.length} 条记录。` : '未找到匹配订单，请核对订单号或邮箱。');
    } catch {
      setOrders([]);
      setPagination(undefined);
      setMessage('查询失败：网络或服务异常，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }

  async function copyTemplate(title: string, body: string) {
    try {
      await navigator.clipboard.writeText(body);
      setCopiedTemplate(title);
      setTimeout(() => setCopiedTemplate(null), 1800);
    } catch {
      setCopiedTemplate('复制失败，请手动选中文字复制');
    }
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
      <section style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <p style={eyebrowStyle}>客服只读查单</p>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>客服工作台</h1>
            <p style={mutedStyle}>用于客服快速确认订单状态、商品摘要、配送方式和脱敏联系方式。此页面不提供退款、改地址、补发、删除等写操作。</p>
          </div>
          <div style={{ ...badgeStyle, background: '#ecfeff', color: '#0e7490' }}>管理员保护 · 脱敏展示 · 审计日志</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 180px auto', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void searchOrders(1);
            }}
            placeholder="输入订单号 KS... 或客户邮箱"
            style={inputStyle}
          />
          <select value={status} onChange={(event) => setStatus(event.target.value)} style={inputStyle}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button type="button" onClick={() => void searchOrders(1)} disabled={loading} style={primaryButtonStyle}>
            {loading ? '查询中…' : '查询订单'}
          </button>
        </div>
        <p style={{ ...mutedStyle, marginTop: 'var(--space-3)' }}>{message}</p>
      </section>

      <section style={statsGridStyle}>
        <MetricCard title="本次结果" value={`${orders.length}`} hint="当前页面订单数" />
        <MetricCard title="商品行" value={`${totalItems}`} hint="订单内商品摘要数" />
        <MetricCard title="分页" value={pagination ? `${pagination.page}/${Math.max(pagination.totalPages, 1)}` : '—'} hint="来自只读查询接口" />
      </section>

      <section style={panelStyle}>
        <h2 style={sectionTitleStyle}>查询结果</h2>
        {orders.length === 0 ? (
          <div style={emptyStyle}>暂无结果。客服可先向客户索要订单号或下单邮箱，再查询。</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-alt)' }}>
                  <th style={thStyle}>订单号</th>
                  <th style={thStyle}>时间</th>
                  <th style={thStyle}>状态</th>
                  <th style={thStyle}>金额</th>
                  <th style={thStyle}>配送</th>
                  <th style={thStyle}>脱敏联系方式</th>
                  <th style={thStyle}>操作</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const sc = getStatusStyle(order.paymentStatus);
                  return (
                    <tr key={order.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{order.orderNumber}</span></td>
                      <td style={tdStyle}>{formatDate(order.createdAt)}</td>
                      <td style={tdStyle}><span style={{ ...badgeStyle, background: sc.bg, color: sc.color }}>{statusLabels[order.paymentStatus] ?? order.paymentStatus}</span></td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{formatPrice(order.total)}</td>
                      <td style={tdStyle}>{order.courier || '—'}<br /><span style={mutedSmallStyle}>{order.addressSummary.prefecture || '—'} / {order.addressSummary.city || '—'}</span></td>
                      <td style={tdStyle}>{order.maskedEmail || '—'}<br /><span style={mutedSmallStyle}>{order.maskedPhone || '—'}</span></td>
                      <td style={tdStyle}><button type="button" onClick={() => setSelectedOrder(order)} style={secondaryButtonStyle}>查看摘要</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pagination && pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
            <button type="button" disabled={loading || pagination.page <= 1} onClick={() => void searchOrders(pagination.page - 1)} style={secondaryButtonStyle}>上一页</button>
            <button type="button" disabled={loading || pagination.page >= pagination.totalPages} onClick={() => void searchOrders(pagination.page + 1)} style={secondaryButtonStyle}>下一页</button>
          </div>
        )}
      </section>

      {selectedOrder && (
        <section style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <h2 style={sectionTitleStyle}>订单摘要：{selectedOrder.orderNumber}</h2>
            <button type="button" onClick={() => setSelectedOrder(null)} style={secondaryButtonStyle}>关闭</button>
          </div>
          <div style={detailGridStyle}>
            <Detail label="支付方式" value={selectedOrder.paymentMethod} />
            <Detail label="订单状态" value={statusLabels[selectedOrder.paymentStatus] ?? selectedOrder.paymentStatus} />
            <Detail label="商品小计" value={formatPrice(selectedOrder.subtotal)} />
            <Detail label="运费" value={formatPrice(selectedOrder.shippingFee)} />
            <Detail label="折扣" value={formatPrice(selectedOrder.discountAmount)} />
            <Detail label="更新时间" value={formatDate(selectedOrder.updatedAt)} />
          </div>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <h3 style={subTitleStyle}>商品摘要</h3>
            <ul style={{ display: 'grid', gap: 'var(--space-2)', paddingLeft: 0, listStyle: 'none' }}>
              {selectedOrder.items.map((item) => (
                <li key={item.id} style={listItemStyle}>{item.productTitle} × {item.quantity} · {formatPrice(item.price)}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section style={twoColumnStyle}>
        <div style={panelStyle}>
          <h2 style={sectionTitleStyle}>工单处理流程</h2>
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {supportTicketSteps.map((step) => (
              <div key={step.title} style={workflowItemStyle}>
                <h3 style={subTitleStyle}>{step.title}</h3>
                <p style={mutedStyle}>{step.description}</p>
                <p style={mutedSmallStyle}>负责人：{step.owner} · 时限：{step.sla}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={panelStyle}>
          <h2 style={sectionTitleStyle}>安全红线</h2>
          <ul style={{ display: 'grid', gap: 'var(--space-2)', paddingLeft: '1.2rem' }}>
            {supportSafetyRules.map((rule) => <li key={rule} style={mutedStyle}>{rule}</li>)}
          </ul>
          <h2 style={{ ...sectionTitleStyle, marginTop: 'var(--space-5)' }}>订单状态说明</h2>
          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            {supportStatusGuides.map((guide) => <div key={guide.status} style={listItemStyle}><strong>{guide.label}</strong>：{guide.meaning}</div>)}
          </div>
        </div>
      </section>

      <section style={panelStyle}>
        <h2 style={sectionTitleStyle}>FAQ 知识库</h2>
        <div style={faqGridStyle}>
          {supportFaqItems.map((item) => (
            <article key={item.question} style={cardStyle}>
              <p style={eyebrowStyle}>{item.category}</p>
              <h3 style={subTitleStyle}>{item.question}</h3>
              <p style={mutedStyle}>{item.answer}</p>
              <p style={mutedSmallStyle}>标签：{item.tags.join(' / ')}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={panelStyle}>
        <h2 style={sectionTitleStyle}>客服回复模板</h2>
        <div style={faqGridStyle}>
          {supportReplyTemplates.map((template) => (
            <article key={template.title} style={cardStyle}>
              <p style={eyebrowStyle}>{template.scenario}</p>
              <h3 style={subTitleStyle}>{template.title}</h3>
              <p style={{ ...mutedStyle, whiteSpace: 'pre-wrap' }}>{template.body}</p>
              <ul style={{ paddingLeft: '1.2rem', margin: 'var(--space-3) 0' }}>
                {template.checklist.map((item) => <li key={item} style={mutedSmallStyle}>{item}</li>)}
              </ul>
              <button type="button" onClick={() => void copyTemplate(template.title, template.body)} style={secondaryButtonStyle}>
                {copiedTemplate === template.title ? '已复制' : '复制话术'}
              </button>
            </article>
          ))}
        </div>
        {copiedTemplate && copiedTemplate.includes('失败') && <p style={{ ...mutedStyle, marginTop: 'var(--space-3)' }}>{copiedTemplate}</p>}
      </section>
    </div>
  );
}

function MetricCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div style={panelStyle}>
      <p style={eyebrowStyle}>{title}</p>
      <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>{value}</p>
      <p style={mutedSmallStyle}>{hint}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={cardStyle}>
      <p style={eyebrowStyle}>{label}</p>
      <p style={{ fontWeight: 700 }}>{value}</p>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-5)',
};

const statsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 'var(--space-4)',
};

const twoColumnStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 'var(--space-4)',
};

const faqGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 'var(--space-4)',
};

const detailGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 'var(--space-3)',
};

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-4)',
  background: 'var(--color-bg-alt)',
};

const workflowItemStyle: React.CSSProperties = {
  borderLeft: '4px solid var(--color-primary)',
  padding: 'var(--space-3) var(--space-4)',
  background: 'var(--color-bg-alt)',
  borderRadius: 'var(--radius-md)',
};

const listItemStyle: React.CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--space-3)',
  background: 'var(--color-bg-alt)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-primary)',
  background: 'var(--color-primary)',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontWeight: 600,
  cursor: 'pointer',
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: '999px',
  padding: '4px 10px',
  fontSize: 'var(--text-xs)',
  fontWeight: 700,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 'var(--text-xl)',
  fontWeight: 800,
  marginBottom: 'var(--space-4)',
};

const subTitleStyle: React.CSSProperties = {
  fontSize: 'var(--text-base)',
  fontWeight: 700,
  marginBottom: 'var(--space-2)',
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--color-primary)',
  fontWeight: 800,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  marginBottom: 'var(--space-1)',
};

const mutedStyle: React.CSSProperties = {
  color: 'var(--color-text-secondary)',
  fontSize: 'var(--text-sm)',
  lineHeight: 1.7,
};

const mutedSmallStyle: React.CSSProperties = {
  color: 'var(--color-text-muted)',
  fontSize: 'var(--text-xs)',
  lineHeight: 1.6,
};

const emptyStyle: React.CSSProperties = {
  padding: 'var(--space-10)',
  textAlign: 'center',
  color: 'var(--color-text-muted)',
};

const thStyle: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  textAlign: 'left',
  fontSize: 'var(--text-xs)',
  fontWeight: 700,
  color: 'var(--color-text-muted)',
};

const tdStyle: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  fontSize: 'var(--text-sm)',
  verticalAlign: 'top',
};
