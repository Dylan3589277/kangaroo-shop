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
  const [error, setError] = useState('');

  async function toggle() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !active }),
      });
      if (!res.ok) throw new Error();
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
          : (locale === 'ja' ? '非公開' : locale === 'zh' ? '已下架' : 'Inactive')
        }
      </button>
      {error && (
        <span style={{ fontSize: 'var(--text-xs)', color: '#dc2626' }}>{error}</span>
      )}
    </div>
  );
}
