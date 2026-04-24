'use client';

import { useState } from 'react';
import { JAPAN_PREFECTURES } from '@/lib/shipping';

interface AddressData {
  name: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2: string;
  phone: string;
  email: string;
}

interface AddressFormProps {
  locale: string;
  initialAddress?: Partial<AddressData>;
  onChange: (address: AddressData) => void;
}

export function AddressForm({ locale, initialAddress = {}, onChange }: AddressFormProps) {
  const [form, setForm] = useState<AddressData>({
    name: initialAddress.name || '',
    postalCode: initialAddress.postalCode || '',
    prefecture: initialAddress.prefecture || '',
    city: initialAddress.city || '',
    address1: initialAddress.address1 || '',
    address2: initialAddress.address2 || '',
    phone: initialAddress.phone || '',
    email: initialAddress.email || '',
  });

  const update = (field: keyof AddressData, value: string) => {
    const newForm = { ...form, [field]: value };
    setForm(newForm);
    onChange(newForm);
  };

  const handlePostalChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 7);
    const formatted = cleaned.length >= 4 ? cleaned.slice(0, 3) + '-' + cleaned.slice(3) : cleaned;
    const newForm = { ...form, postalCode: formatted };
    setForm(newForm);
    onChange(newForm);
  };

  const labels: Record<string, Record<string, string>> = {
    ja: {
      name: '氏名', postal: '郵便番号', pref: '都道府県', city: '市区町村',
      addr1: '町名・番地', addr2: '建物名（任意）', phone: '電話番号', email: 'メールアドレス',
    },
    zh: {
      name: '姓名', postal: '邮编', pref: '都道府县', city: '市区町村',
      addr1: '地址', addr2: '建筑物（可选）', phone: '电话号码', email: '邮箱',
    },
    en: {
      name: 'Full Name', postal: 'Postal Code', pref: 'Prefecture', city: 'City',
      addr1: 'Address', addr2: 'Building (optional)', phone: 'Phone', email: 'Email',
    },
  };
  const t = labels[locale as keyof typeof labels] || labels.ja;

  const required = <span style={{ color: 'var(--color-error)' }}>*</span>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* 氏名 */}
      <div>
        <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 4 }}>
          {t.name} {required}
        </label>
        <input
          className="input"
          value={form.name}
          onChange={e => update('name', e.target.value)}
          placeholder={locale === 'ja' ? '山田 太郎' : 'Taro Yamada'}
        />
      </div>

      {/* 郵便番号 */}
      <div>
        <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 4 }}>
          {t.postal} {required}
        </label>
        <input
          className="input"
          value={form.postalCode}
          onChange={e => handlePostalChange(e.target.value)}
          placeholder="123-4567"
          maxLength={8}
        />
      </div>

      {/* 都道府県 */}
      <div>
        <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 4 }}>
          {t.pref} {required}
        </label>
        <select
          className="input"
          value={form.prefecture}
          onChange={e => update('prefecture', e.target.value)}
          style={{ cursor: 'pointer' }}
        >
          <option value="">-- {t.pref} --</option>
          {JAPAN_PREFECTURES.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* 市区町村 */}
      <div>
        <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 4 }}>
          {t.city} {required}
        </label>
        <input
          className="input"
          value={form.city}
          onChange={e => update('city', e.target.value)}
          placeholder={locale === 'ja' ? '大阪市北区' : ''}
        />
      </div>

      {/* 町名・番地 */}
      <div>
        <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 4 }}>
          {t.addr1} {required}
        </label>
        <input
          className="input"
          value={form.address1}
          onChange={e => update('address1', e.target.value)}
          placeholder={locale === 'ja' ? '梅田1-2-3' : ''}
        />
      </div>

      {/* 建物名 */}
      <div>
        <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 4 }}>
          {t.addr2}
        </label>
        <input
          className="input"
          value={form.address2}
          onChange={e => update('address2', e.target.value)}
          placeholder={locale === 'ja' ? '梅田ビル301' : ''}
        />
      </div>

      {/* 電話 */}
      <div>
        <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 4 }}>
          {t.phone} {required}
        </label>
        <input
          className="input"
          type="tel"
          value={form.phone}
          onChange={e => update('phone', e.target.value)}
          placeholder="090-1234-5678"
        />
      </div>

      {/* メール */}
      <div>
        <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 4 }}>
          {t.email} {required}
        </label>
        <input
          className="input"
          type="email"
          value={form.email}
          onChange={e => update('email', e.target.value)}
          placeholder="example@mail.com"
        />
      </div>
    </div>
  );
}
