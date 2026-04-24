'use client';

import { useState } from 'react';
import { ShippingOption, Courier } from '@/lib/shipping';

interface ShippingSelectorProps {
  options: ShippingOption[];
  selected: Courier | null;
  onChange: (courier: Courier) => void;
  locale: string;
}

export function ShippingSelector({ options, selected, onChange, locale }: ShippingSelectorProps) {
  const [showDesc, setShowDesc] = useState<Courier | null>(null);

  const courierIcons: Record<Courier, string> = {
    yamato: '📦',
    sagawa: '🚚',
    yuubin: '📮',
  };

  const labels = {
    ja: { title: '配送方法', days: 'お届け' },
    zh: { title: '配送方式', days: '送达' },
    en: { title: 'Shipping Method', days: 'Delivery' },
  };
  const t = labels[locale as keyof typeof labels] || labels.ja;

  return (
    <div>
      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)' }}>
        {t.title}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {options.map(opt => (
          <div key={opt.courier}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              padding: 'var(--space-4)', border: `1px solid ${selected === opt.courier ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              background: selected === opt.courier ? 'rgba(139,0,0,0.04)' : 'var(--color-surface)',
              transition: 'all var(--transition-fast)',
            }}>
              <input
                type="radio"
                name="shipping"
                value={opt.courier}
                checked={selected === opt.courier}
                onChange={() => onChange(opt.courier)}
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <span style={{ fontSize: '1.25rem' }}>{courierIcons[opt.courier]}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 'var(--text-sm)' }}>{opt.name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  {t.days}：{opt.estimatedDays}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                  ¥{opt.fee.toLocaleString()}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setShowDesc(showDesc === opt.courier ? null : opt.courier); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.65rem', color: 'var(--color-text-muted)', textDecoration: 'underline' }}
                >
                  {locale === 'ja' ? '詳細' : locale === 'zh' ? '详情' : 'Details'}
                </button>
              </div>
            </label>

            {showDesc === opt.courier && (
              <div style={{
                marginTop: 'var(--space-2)', padding: 'var(--space-3)',
                background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)',
              }}>
                {opt.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
