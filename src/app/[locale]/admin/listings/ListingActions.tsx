'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  productId: string;
  isActive: boolean;
  locale: string;
};

const labels = {
  ja: {
    publish: '自営サイト公開',
    unpublish: '自営サイト下書きへ',
    updating: '更新中...',
    updateFailed: '更新に失敗しました',
    rakuten: 'Rakuten CSV',
    amazon: 'Amazon TSV',
    downloadNotice: 'テンプレートのみをダウンロードします。外部モールには書き込みません。',
  },
  zh: {
    publish: '自营站发布',
    unpublish: '自营站下架',
    updating: '更新中...',
    updateFailed: '更新失败',
    rakuten: 'Rakuten CSV',
    amazon: 'Amazon TSV',
    downloadNotice: '仅下载模板，不会写入外部平台。',
  },
  en: {
    publish: 'Publish own site',
    unpublish: 'Unpublish own site',
    updating: 'Updating...',
    updateFailed: 'Update failed',
    rakuten: 'Rakuten CSV',
    amazon: 'Amazon TSV',
    downloadNotice: 'Template download only. No external marketplace write.',
  },
};

export default function ListingActions({ productId, isActive, locale }: Props) {
  const router = useRouter();
  const [active, setActive] = useState(isActive);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const t = labels[locale as keyof typeof labels] || labels.ja;

  async function updateOwnListing() {
    setLoading(true);
    setMessage('');
    setError('');
    const nextActive = !active;

    try {
      const res = await fetch('/api/admin/platform-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          platform: 'own',
          action: nextActive ? 'publish' : 'unpublish',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || t.updateFailed);
      }

      setActive(nextActive);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.updateFailed);
      window.setTimeout(() => setError(''), 3500);
    } finally {
      setLoading(false);
    }
  }

  function downloadTemplate(platform: 'rakuten' | 'amazon') {
    setError('');
    setMessage(t.downloadNotice);
    const url = `/api/admin/platform-listings/template?productId=${encodeURIComponent(productId)}&platform=${platform}`;
    window.location.href = url;
    window.setTimeout(() => setMessage(''), 3500);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
      <button
        type="button"
        onClick={updateOwnListing}
        disabled={loading}
        style={{
          padding: '6px 12px',
          borderRadius: 'var(--radius-md)',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.65 : 1,
          background: active ? '#fee2e2' : 'var(--color-primary)',
          color: active ? '#b91c1c' : '#fff',
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        {loading ? t.updating : active ? t.unpublish : t.publish}
      </button>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => downloadTemplate('rakuten')} style={templateButtonStyle}>
          {t.rakuten}
        </button>
        <button type="button" onClick={() => downloadTemplate('amazon')} style={templateButtonStyle}>
          {t.amazon}
        </button>
      </div>

      {message && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{message}</span>}
      {error && <span style={{ fontSize: 'var(--text-xs)', color: '#dc2626' }}>{error}</span>}
    </div>
  );
}

const templateButtonStyle: React.CSSProperties = {
  padding: '4px 9px',
  borderRadius: '999px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
  fontSize: 'var(--text-xs)',
  fontWeight: 500,
};
