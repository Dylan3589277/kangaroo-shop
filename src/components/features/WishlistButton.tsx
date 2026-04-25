'use client';

import { useState, useEffect } from 'react';

interface Props {
  productId: string;
  locale: string;
}

export function WishlistButton({ productId, locale }: Props) {
  const [wishlisted, setWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);

  // 组件挂载时查询当前商品是否已在心愿单
  useEffect(() => {
    const checkWishlist = async () => {
      try {
        const res = await fetch('/api/wishlist', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          const isWishlisted = data.items.some(
            (item: { productId: string }) => item.productId === productId
          );
          setWishlisted(isWishlisted);
        }
      } catch {
        // 静默失败，保持 wishlisted 为 false
      }
    };
    checkWishlist();
  }, [productId]);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/wishlist', {
        method: wishlisted ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
        credentials: 'include',
      });
      if (res.ok) {
        setWishlisted(!wishlisted);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={wishlisted ? (locale === 'ja' ? 'お気に入りから削除' : locale === 'zh' ? '取消收藏' : 'Remove from wishlist') : (locale === 'ja' ? 'お気に入りに追加' : locale === 'zh' ? '添加收藏' : 'Add to wishlist')}
      style={{
        background: 'none',
        border: 'none',
        cursor: loading ? 'wait' : 'pointer',
        fontSize: '1.3rem',
        padding: '6px',
        lineHeight: 1,
        opacity: loading ? 0.6 : 1,
      }}
    >
      {wishlisted ? '❤️' : '🤍'}
    </button>
  );
}
