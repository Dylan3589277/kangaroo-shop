'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Product, formatPrice, parseProductImages } from '@/lib/products';
import { useCart } from '@/contexts/CartContext';

interface ProductCardProps {
  product: Product;
  locale: string;
}

export function ProductCard({ product, locale }: ProductCardProps) {
  const { addItem } = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleGoToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/${locale}/cart`);
  };
  const sourceLabel: Record<string, string> = {
    rakuten: '楽天',
    zozotown: 'ZOZO',
    amazon: 'Amazon',
    mercari: 'メルカリ',
    own: '自社',
  };

  // Localized button texts
  const buttonLabels = {
    ja: { add: 'カートに追加', added: '✓ 追加済み！カートへ →', outOfStock: '在庫切れ' },
    zh: { add: '加入购物车', added: '✓ 已添加！前往购物车 →', outOfStock: '缺货' },
    en: { add: 'Add to Cart', added: '✓ Added! Go to Cart →', outOfStock: 'Out of Stock' },
  };
  const t = buttonLabels[locale as keyof typeof buttonLabels] ?? buttonLabels.ja;

  return (
    <article className="card" style={{ position: 'relative' }}>
      {/* 图片 */}
      <div style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden' }}>
        <Image
          src={parseProductImages(product.images)[0]}
          alt={product.title}
          fill
          style={{ objectFit: 'cover', background: 'var(--color-bg-alt)' }}
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        {/* 来源标签 */}
        <span style={{
          position: 'absolute', top: 8, left: 8,
          background: 'rgba(0,0,0,0.6)', color: '#fff',
          fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px',
        }}>
          {sourceLabel[product.source ?? 'own']}
        </span>
        {/* 缺货遮罩 */}
        {!product.inStock && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.875rem' }}>{t.outOfStock}</span>
          </div>
        )}
      </div>

      {/* 信息 */}
      <div className="card-body" style={{ padding: 'var(--space-3)' }}>
        <h3 style={{
          fontSize: 'var(--text-sm)', fontWeight: 500,
          marginBottom: 'var(--space-1)', lineHeight: 1.4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {product.title}
        </h3>

        {/* 评分 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 'var(--space-2)' }}>
          <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>
            {'★'.repeat(Math.round(product.rating ?? 0))}
            {'☆'.repeat(5 - Math.round(product.rating ?? 0))}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            {product.rating} ({product.reviews})
          </span>
        </div>

        {/* 价格 */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-primary)' }}>
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>

        {/* 购买按钮 */}
        {added ? (
          <button
            className="btn"
            style={{ width: '100%', fontSize: 'var(--text-xs)', padding: '0.4rem', background: 'var(--color-success)', color: '#fff', border: 'none' }}
            onClick={handleGoToCart}
          >
            {t.added}
          </button>
        ) : (
          <button
            className="btn btn-primary"
            disabled={!product.inStock}
            onClick={handleAddToCart}
            style={{ width: '100%', fontSize: 'var(--text-xs)', padding: '0.4rem' }}
          >
            {product.inStock ? t.add : t.outOfStock}
          </button>
        )}
      </div>
    </article>
  );
}
