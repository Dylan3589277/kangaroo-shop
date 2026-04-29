'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  productId: string;
  isActive: boolean;
  locale: string;
};

export default function ProductActiveToggle({ productId, isActive, locale }: Props) {
  const router = useRouter();
  const [active, setActive] = useState(isActive);
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function toggle() {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/admin/platform-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          platform: 'own',
          action: active ? 'unpublish' : 'publish',
        }),
      });
      if (!res.ok) throw new Error('Update failed');
      setActive(!active);
      router.refresh();
    } catch {
      setActive(isActive); // 回滚
      setError(locale === 'ja' ? '更新失敗' : locale === 'zh' ? '更新失败' : 'Update failed');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  }

  function downloadTemplate(platform: 'rakuten' | 'amazon') {
    setDownloadLoading(platform);
    setError('');
    setNotice('');
    try {
      const url = `/api/admin/platform-listings/template?productId=${encodeURIComponent(productId)}&platform=${platform}`;
      window.location.href = url;
      setNotice(
        platform === 'rakuten'
          ? (locale === 'ja' ? '楽天CSVテンプレートをダウンロードします。外部平台には上架しません。' : locale === 'zh' ? '正在下载乐天 CSV 模板，不会直接上架。' : 'Downloading Rakuten CSV template. No external publish.')
          : (locale === 'ja' ? 'Amazon TSVテンプレートをダウンロードします。外部平台には上架しません。' : locale === 'zh' ? '正在下载 Amazon TSV 模板，不会直接上架。' : 'Downloading Amazon TSV template. No external publish.')
      );
      setTimeout(() => {
        setNotice('');
        setDownloadLoading('');
      }, 4000);
    } catch (err) {
      setDownloadLoading('');
      setError(err instanceof Error ? err.message : 'Download failed');
      setTimeout(() => setError(''), 3000);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
      <button
        onClick={toggle}
        disabled={loading}
        style={{
          padding: '4px 10px',
          borderRadius: '999px',
          fontSize: 'var(--text-xs)',
          fontWeight: 500,
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          background: active ? '#dcfce7' : '#fef2f2',
          color: active ? '#16a34a' : '#dc2626',
        }}
      >
        {loading ? '...' : active
          ? (locale === 'ja' ? '公開中' : locale === 'zh' ? '上架中' : 'Active')
          : (locale === 'ja' ? '下書き' : locale === 'zh' ? '草稿/下架' : 'Draft')
        }
      </button>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {(['rakuten', 'amazon'] as const).map((platform) => (
          <button
            key={platform}
            type="button"
            onClick={() => downloadTemplate(platform)}
            disabled={Boolean(downloadLoading)}
            style={{
              padding: '3px 8px',
              borderRadius: '999px',
              fontSize: '11px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              cursor: downloadLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {downloadLoading === platform ? '...' : platform === 'rakuten' ? 'Rakuten CSV' : 'Amazon TSV'}
          </button>
        ))}
      </div>
      {notice && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{notice}</span>
      )}
      {error && (
        <span style={{ fontSize: 'var(--text-xs)', color: '#dc2626' }}>{error}</span>
      )}
    </div>
  );
}
