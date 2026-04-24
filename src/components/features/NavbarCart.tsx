'use client';

import { Link } from '@/i18n/routing';
import { useCart } from '@/contexts/CartContext';

export function NavbarCart() {
  const { totalItems } = useCart();

  return (
    <Link href="/cart" style={{ fontSize: 'var(--text-lg)', position: 'relative' }}>
      🛒
      {totalItems > 0 && (
        <span style={{
          position: 'absolute',
          top: -6,
          right: -10,
          background: 'var(--color-error, #c62828)',
          color: '#fff',
          fontSize: '0.6rem',
          fontWeight: 700,
          borderRadius: '50%',
          width: 16,
          height: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {totalItems > 99 ? '99+' : totalItems}
        </span>
      )}
    </Link>
  );
}
