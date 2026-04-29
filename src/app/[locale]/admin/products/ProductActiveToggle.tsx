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
  const [previewLoading, setPreviewLoading] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');

  async function toggle() {
    setLoading(true);
    setError('');
    setPreview('');
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

  async function previewExternal(platform: 'rakuten' | 'amazon') {
    setPreviewLoading(platform);
    setError('');
    setPreview('');
    try {
      const res = await fetch('/api/admin/platform-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, platform, action: 'preview' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Preview failed');
      setPreview(
        platform === 'rakuten'
          ? (locale === 'ja' ? '楽天CSVテンプレートのみ' : locale === 'zh' ? '乐天仅生成 CSV 模板' : 'Rakuten CSV template only')
          : (locale === 'ja' ? 'Amazonテンプレートのみ' : locale === 'zh' ? 'Amazon 仅生成模板' : 'Amazon template only')
      );
      setTimeout(() => setPreview(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
      setTimeout(() => setError(''), 3000);
    } finally {
      setPreviewLoading('');
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
            onClick={() => previewExternal(platform)}
            disabled={Boolean(previewLoading)}
            style={{
              padding: '3px 8px',
              borderRadius: '999px',
              fontSize: '11px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              cursor: previewLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {previewLoading === platform ? '...' : platform === 'rakuten' ? 'Rakuten preview' : 'Amazon preview'}
          </button>
        ))}
      </div>
      {preview && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{preview}</span>
      )}
      {error && (
        <span style={{ fontSize: 'var(--text-xs)', color: '#dc2626' }}>{error}</span>
      )}
    </div>
  );
}
