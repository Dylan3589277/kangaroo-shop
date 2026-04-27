'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { formatPrice, parseProductImages } from '@/lib/products';

interface WishlistItem {
  id: string;
  productId: string;
  product: {
    id: string;
    title: string;
    titleEn: string | null;
    price: number;
    images: string[];
    inStock: boolean;
  };
  addedAt: string;
}

export default function WishlistClient() {
  const t = useTranslations('wishlist');
  const locale = useLocale();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/wishlist', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.items) setItems(d.items); })
      .catch(() => { /* silently fail */ })
      .finally(() => setLoading(false));
  }, []);

  const remove = async (productId: string) => {
    setRemovingId(productId);
    try {
      await fetch('/api/wishlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
        credentials: 'include',
      });
      setItems(prev => prev.filter(i => i.productId !== productId));
    } catch {
      /* silently fail */
    } finally {
      setRemovingId(null);
    }
  };

  const getProductTitle = (item: WishlistItem) => {
    if (locale === 'zh' || locale === 'ja') {
      return item.product.title;
    }
    return item.product.titleEn ?? item.product.title;
  };

  if (loading) return (
    <main className="container" style={{ paddingTop: 'var(--space-12)', textAlign: 'center' }}>
      <p>...</p>
    </main>
  );

  if (items.length === 0) return (
    <main className="container" style={{ paddingTop: 'var(--space-12)', textAlign: 'center' }}>
      <div style={{ fontSize: '5rem', marginBottom: 'var(--space-4)' }}>🤍</div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-4)' }}>{t('title')}</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>{t('empty')}</p>
      <Link href={`/${locale}/products`} className="btn btn-primary">{t('continue')}</Link>
    </main>
  );

  return (
    <main className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-16)' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)', textAlign: 'center' }}>{t('title')}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-6)', maxWidth: 960, margin: '0 auto' }}>
        {items.map(item => (
          <div key={item.id} style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
            <Link href={`/${locale}/products/${item.product.id}`}>
              <div style={{ position: 'relative', aspectRatio: '1/1' }}>
                <Image src={parseProductImages(item.product.images)[0]} alt={getProductTitle(item)} fill style={{ objectFit: 'cover' }} />
              </div>
            </Link>
            <div style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Link href={`/${locale}/products/${item.product.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
                  <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)', lineHeight: 1.4 }}>{getProductTitle(item)}</h3>
                </Link>
                <button
                  onClick={() => remove(item.productId)}
                  disabled={removingId === item.productId}
                  style={{ background: 'none', border: 'none', cursor: removingId === item.productId ? 'wait' : 'pointer', fontSize: '1rem', marginLeft: 'var(--space-2)', opacity: removingId === item.productId ? 0.5 : 1 }}
                  title={t('remove')}
                >
                  {removingId === item.productId ? '⏳' : '🗑'}
                </button>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>{formatPrice(item.product.price)}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{t('added')}: {new Date(item.addedAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US')}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
        <Link href={`/${locale}/products`} className="btn btn-primary">{t('continue')}</Link>
      </div>
    </main>
  );
}
