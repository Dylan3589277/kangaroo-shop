'use client';

import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { Product } from '@/lib/products';

interface AddToCartButtonProps {
  product: Product;
  locale: string;
}

export function AddToCartButton({ product, locale }: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const labels = {
    ja: { add: 'カートに追加', out: '在庫切れ', added: '追加しました！' },
    zh: { add: '加入购物车', out: '缺货', added: '已加入！' },
    en: { add: 'Add to Cart', out: 'Out of Stock', added: 'Added!' },
  };
  const t = labels[locale as keyof typeof labels] ?? labels.ja;

  const handleAdd = () => {
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (!product.inStock) {
    return (
      <button
        className="btn btn-primary"
        disabled
        style={{ flex: 1, padding: '0.875rem', fontSize: 'var(--text-base)', opacity: 0.5 }}
      >
        {t.out}
      </button>
    );
  }

  return (
    <button
      className="btn btn-primary"
      onClick={handleAdd}
      style={{
        flex: 1,
        padding: '0.875rem',
        fontSize: 'var(--text-base)',
        background: added ? 'var(--color-success, #2e7d32)' : undefined,
        transition: 'background 0.2s',
      }}
    >
      {added ? `✓ ${t.added}` : t.add}
    </button>
  );
}
