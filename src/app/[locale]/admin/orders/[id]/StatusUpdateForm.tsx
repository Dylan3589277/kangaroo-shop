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

/** 高风险状态变更：需要二次确认 */
const DANGEROUS_STATUSES = ['cancelled', 'refunded'];

export default function StatusUpdateForm({ orderId, locale, currentStatus, t }: Props) {
  const router = useRouter();
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  const confirmText = {
    ja: {
      title: '操作確認',
      message: (from: string, to: string) =>
        `注文ステータスを「${from}」から「${to}」に変更します。この操作は取り消せません。続行しますか？`,
      noteRequired: '※ キャンセル・返金時は備考の記入が必須です',
      confirm: '確認して実行',
      cancel: '戻る',
    },
    zh: {
      title: '操作确认',
      message: (from: string, to: string) =>
        `确认将订单状态从"${from}"变更为"${to}"？此操作不可撤销。`,
      noteRequired: '※ 取消/退款时备注为必填项',
      confirm: '确认执行',
      cancel: '返回',
    },
    en: {
      title: 'Confirm Action',
      message: (from: string, to: string) =>
        `Change order status from "${from}" to "${to}"? This action cannot be undone.`,
      noteRequired: '* Note is required for cancellation/refund',
      confirm: 'Confirm',
      cancel: 'Cancel',
    },
  };

  const lang = (locale === 'ja' ? 'ja' : locale === 'zh' ? 'zh' : 'en') as 'ja' | 'zh' | 'en';
  const cfm = confirmText[lang];

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newStatus === currentStatus && !note) {
      setError(t.errorNoChange);
      return;
    }

    // 高风险状态变更 → 弹确认框
    if (DANGEROUS_STATUSES.includes(newStatus)) {
      if (!note.trim()) {
        setError(locale === 'ja' ? 'キャンセル・返金時は備考が必須です' : locale === 'zh' ? '取消/退款时必须填写备注' : 'Note required for cancellation/refund');
        return;
      }
      setShowConfirm(true);
      return;
    }

    doSubmit();
  }

  async function doSubmit() {
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
      setShowConfirm(false);
      setTimeout(() => {
        router.refresh();
        setSuccess(false);
      }, 1500);
    } catch {
      setError(t.errorUpdate);
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
          <label htmlFor="note" style={labelStyle}>
            {t.note}（{t.optional}）
            {DANGEROUS_STATUSES.includes(newStatus) && (
              <span style={{ color: '#dc2626', fontSize: 'var(--text-xs)', marginLeft: 'var(--space-2)' }}>
                {locale === 'ja' ? '※ 必須' : locale === 'zh' ? '※ 必填' : '* Required'}
              </span>
            )}
          </label>
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
            background: DANGEROUS_STATUSES.includes(newStatus) ? '#dc2626' : 'var(--color-primary)',
          }}
        >
          {loading ? t.updating : t.update}
        </button>
      </form>

      {/* 确认弹窗 */}
      {showConfirm && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
              ⚠️ {cfm.title}
            </h3>
            <p style={{ marginBottom: 'var(--space-3)', color: 'var(--color-text)', lineHeight: 1.6 }}>
              {cfm.message(
                statusLabels[locale]?.[currentStatus] || currentStatus,
                statusLabels[locale]?.[newStatus] || newStatus
              )}
            </p>
            <p style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', color: '#dc2626' }}>
              {cfm.noteRequired}
            </p>
            <p style={{
              marginBottom: 'var(--space-6)',
              padding: 'var(--space-3)',
              background: '#f3f4f6',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)',
            }}>
              {t.note}：{note}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowConfirm(false); setError(''); }}
                disabled={loading}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {cfm.cancel}
              </button>
              <button
                onClick={doSubmit}
                disabled={loading}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: '#dc2626',
                  color: '#fff',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? t.updating : cfm.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

const modalStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-6)',
  maxWidth: '480px',
  width: '90%',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
};
