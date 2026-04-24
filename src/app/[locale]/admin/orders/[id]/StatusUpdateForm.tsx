'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  orderId: string;
  locale: string;
  currentStatus: string;
  t: Record<string, string>;
};

const STATUS_OPTIONS = ['pending', 'paid', 'failed', 'cancelled', 'refunded'] as const;

export default function StatusUpdateForm({ orderId, locale, currentStatus, t }: Props) {
  const router = useRouter();
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newStatus === currentStatus && !note) {
      setError(t.errorNoChange);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note: note || undefined }),
      });

      if (!res.ok) throw new Error('Failed');

      setSuccess(true);
      setTimeout(() => {
        router.refresh();
        setSuccess(false);
      }, 1500);
    } catch {
      setError(t.errorUpdate);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* 当前状态 */}
      <div>
        <label style={labelStyle}>{t.currentStatus}</label>
        <div style={{
          display: 'inline-block',
          padding: '4px 12px',
          borderRadius: '999px',
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          background: statusBg(currentStatus),
          color: statusColor(currentStatus),
        }}>
          {statusLabels[locale]?.[currentStatus] || currentStatus}
        </div>
      </div>

      {/* 新状态 */}
      <div>
        <label htmlFor="new-status" style={labelStyle}>{t.newStatus}</label>
        <select
          id="new-status"
          value={newStatus}
          onChange={e => setNewStatus(e.target.value)}
          style={selectStyle}
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>
              {statusLabels[locale]?.[s] || s}
            </option>
          ))}
        </select>
      </div>

      {/* 备注 */}
      <div>
        <label htmlFor="note" style={labelStyle}>{t.note}（{t.optional}）</label>
        <textarea
          id="note"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={t.notePlaceholder}
          rows={2}
          style={{ ...selectStyle, resize: 'vertical' }}
        />
      </div>

      {error && <div style={errorStyle}>{error}</div>}
      {success && <div style={successStyle}>{t.successUpdate}</div>}

      <button
        type="submit"
        disabled={loading}
        style={{
          ...btnStyle,
          opacity: loading ? 0.6 : 1,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? t.updating : t.update}
      </button>
    </form>
  );
}

function statusBg(s: string) {
  switch (s) {
    case 'paid': return '#dcfce7';
    case 'failed': return '#fef2f2';
    case 'cancelled': return '#f3f4f6';
    case 'refunded': return '#ede9fe';
    default: return '#fef9c3';
  }
}

function statusColor(s: string) {
  switch (s) {
    case 'paid': return '#16a34a';
    case 'failed': return '#dc2626';
    case 'cancelled': return '#6b7280';
    case 'refunded': return '#7c3aed';
    default: return '#ca8a04';
  }
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--text-sm)',
  fontWeight: 500,
  marginBottom: 'var(--space-2)',
  color: 'var(--color-text)',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  fontSize: 'var(--text-sm)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
};

const btnStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-4)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-primary)',
  color: '#fff',
  fontSize: 'var(--text-sm)',
  fontWeight: 600,
  border: 'none',
  alignSelf: 'flex-start',
};

const errorStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-md)',
  background: '#fef2f2',
  color: '#dc2626',
  fontSize: 'var(--text-sm)',
};

const successStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-md)',
  background: '#dcfce7',
  color: '#16a34a',
  fontSize: 'var(--text-sm)',
};
