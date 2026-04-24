'use client';

import { useState } from 'react';

interface PaymentMethodsProps {
  amount: number;
  locale: string;
  onStripeSelected: () => void;
  onPayPalSelected: () => void;
}

export function PaymentMethods({ amount, locale, onStripeSelected, onPayPalSelected }: PaymentMethodsProps) {
  const [selected, setSelected] = useState<'stripe' | 'paypal' | null>(null);

  const labels = {
    ja: { title: 'お支払い方法', stripe: 'クレジットカード', paypal: 'PayPal', proceed: '次に進む' },
    zh: { title: '支付方式', stripe: '信用卡', paypal: 'PayPal', proceed: '继续' },
    en: { title: 'Payment Method', stripe: 'Credit Card', paypal: 'PayPal', proceed: 'Proceed' },
  };
  const t = labels[locale as keyof typeof labels] || labels.en;

  return (
    <div>
      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)' }}>
        {t.title}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
          padding: 'var(--space-4)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)', cursor: 'pointer',
          background: selected === 'stripe' ? 'rgba(139,0,0,0.04)' : 'var(--color-surface)',
          transition: 'all var(--transition-fast)',
        }}>
          <input
            type="radio"
            name="payment"
            value="stripe"
            checked={selected === 'stripe'}
            onChange={() => setSelected('stripe')}
            style={{ accentColor: 'var(--color-primary)' }}
          />
          <span style={{ flex: 1, fontWeight: 500 }}>{t.stripe}</span>
          <div style={{ display: 'flex', gap: 'var(--space-1)', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            <span>Visa</span><span>Master</span><span>Amex</span>
          </div>
        </label>

        <label style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
          padding: 'var(--space-4)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)', cursor: 'pointer',
          background: selected === 'paypal' ? 'rgba(139,0,0,0.04)' : 'var(--color-surface)',
          transition: 'all var(--transition-fast)',
        }}>
          <input
            type="radio"
            name="payment"
            value="paypal"
            checked={selected === 'paypal'}
            onChange={() => setSelected('paypal')}
            style={{ accentColor: 'var(--color-primary)' }}
          />
          <span style={{ flex: 1, fontWeight: 500 }}>PayPal</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>PayPal</span>
        </label>
      </div>

      {selected && (
        <button
          onClick={() => selected === 'stripe' ? onStripeSelected() : onPayPalSelected()}
          className="btn btn-primary"
          style={{ width: '100%', marginTop: 'var(--space-4)', fontSize: 'var(--text-base)', padding: '0.875rem' }}
        >
          {t.proceed} ¥{amount.toLocaleString()}
        </button>
      )}
    </div>
  );
}
