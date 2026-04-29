'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Product = {
  id?: string;
  title: string;
  titleEn?: string | null;
  titleJa?: string | null;
  brand?: string | null;
  price: number;
  originalPrice?: number | null;
  currency?: string;
  images?: string[];
  category?: string;
  source?: string;
  sourceUrl?: string | null;
  rating?: number;
  reviews?: number;
  inStock?: boolean;
  stock?: number;
  description?: string | null;
  weight?: number;
  isActive?: boolean;
};

type Props = {
  product?: Product;
  isNew: boolean;
  locale: string;
};

const CATEGORIES = ['brainrot', 'anime', 'baby', 'lifestyle'];
const SOURCES = ['own', 'rakuten', 'zozotown', 'amazon', 'mercari'];

export default function ProductForm({ product, isNew, locale }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(product?.title || '');
  const [titleEn, setTitleEn] = useState(product?.titleEn || '');
  const [titleJa, setTitleJa] = useState(product?.titleJa || '');
  const [brand, setBrand] = useState(product?.brand || '');
  const [price, setPrice] = useState(product?.price ? String(product.price) : '');
  const [originalPrice, setOriginalPrice] = useState(
    product?.originalPrice ? String(product.originalPrice) : ''
  );
  const [category, setCategory] = useState(product?.category || 'brainrot');
  const [source, setSource] = useState(product?.source || 'own');
  const [sourceUrl, setSourceUrl] = useState(product?.sourceUrl || '');
  const [images, setImages] = useState((product?.images || []).join('\n'));
  const [stock, setStock] = useState(String(product?.stock ?? 0));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [inStock, setInStock] = useState(product?.inStock ?? true);
  const [weight, setWeight] = useState(String(product?.weight ?? 200));
  const [description, setDescription] = useState(product?.description || '');
  const [isActive, setIsActive] = useState(product?.isActive ?? true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const t = {
    ja: {
      title: '商品名',
      titleEn: '英語名',
      price: '価格 (円)',
      originalPrice: '原价 (円)',
      category: 'カテゴリ',
      source: 'ソース',
      sourceUrl: 'ソースURL',
      images: '画像URL (1行に1つ)',
      stock: '在庫数',
      inStock: '在庫あり',
      weight: '重量 (g)',
      description: '商品説明',
      isActive: '公開状態',
      active: '公開',
      inactive: '非公開',
      save: '保存する',
      saving: '保存中...',
      cancel: 'キャンセル',
      success: '保存しました',
      error: '保存に失敗しました',
      required: '必須',
    },
    zh: {
      title: '商品名称',
      titleEn: '英文名',
      price: '价格 (日元)',
      originalPrice: '原价 (日元)',
      category: '分类',
      source: '来源',
      sourceUrl: '来源URL',
      images: '图片URL (每行一个)',
      stock: '库存数量',
      inStock: '有库存',
      weight: '重量 (g)',
      description: '商品描述',
      isActive: '发布状态',
      active: '上架',
      inactive: '下架',
      save: '保存',
      saving: '保存中...',
      cancel: '取消',
      success: '已保存',
      error: '保存失败',
      required: '必填',
    },
    en: {
      title: 'Title',
      titleEn: 'English Title',
      price: 'Price (JPY)',
      originalPrice: 'Original Price (JPY)',
      category: 'Category',
      source: 'Source',
      sourceUrl: 'Source URL',
      images: 'Image URLs (one per line)',
      stock: 'Stock',
      inStock: 'In Stock',
      weight: 'Weight (g)',
      description: 'Description',
      isActive: 'Status',
      active: 'Active',
      inactive: 'Inactive',
      save: 'Save',
      saving: 'Saving...',
      cancel: 'Cancel',
      success: 'Saved',
      error: 'Save failed',
      required: 'Required',
    },
  };

  const labels = t[locale as keyof typeof t] || t.ja;

  const categoryLabels: Record<string, Record<string, string>> = {
    ja: { brainrot: 'Brainrot', anime: 'アニメ', baby: 'ベビー', lifestyle: 'ライフスタイル' },
    zh: { brainrot: 'Brainrot', anime: '动漫', baby: '婴儿', lifestyle: '生活方式' },
    en: { brainrot: 'Brainrot', anime: 'Anime', baby: 'Baby', lifestyle: 'Lifestyle' },
  };

  const sourceLabels: Record<string, Record<string, string>> = {
    ja: { own: '自社', rakuten: '楽天', zozotown: 'ZOZOTOWN', amazon: 'Amazon', mercari: 'Mercari' },
    zh: { own: '自有', rakuten: '乐天', zozotown: 'ZOZOTOWN', amazon: 'Amazon', mercari: 'Mercari' },
    en: { own: 'Own', rakuten: 'Rakuten', zozotown: 'ZOZOTOWN', amazon: 'Amazon', mercari: 'Mercari' },
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const priceInt = Math.round(parseFloat(price));
    if (isNaN(priceInt) || priceInt <= 0) {
      setError(labels.price + ' ' + labels.required);
      return;
    }

    const origInt = originalPrice ? Math.round(parseFloat(originalPrice)) : undefined;

    const payload = {
      title,
      titleEn: titleEn || null,
      titleJa: titleJa || null,
      brand: brand || null,
      price: priceInt,
      originalPrice: origInt,
      category,
      source,
      sourceUrl: sourceUrl || null,
      images: images.split('\n').map(s => s.trim()).filter(Boolean),
      stock: parseInt(stock) || 0,
      inStock,
      weight: parseInt(weight) || 200,
      description: description || null,
      isActive,
    };

    setLoading(true);

    try {
      const url = isNew
        ? '/api/products'
        : `/api/products/${product?.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();

      router.push(`/${locale}/admin/products`);
    } catch {
      setError(labels.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Title */}
      <FormField label={`${labels.title} *`} hint={labels.required}>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          style={inputStyle}
          placeholder="例: 鯖のぬいぐるみ"
        />
      </FormField>

      {/* Title EN */}
      <FormField label={labels.titleEn}>
        <input
          type="text"
          value={titleEn}
          onChange={e => setTitleEn(e.target.value)}
          style={inputStyle}
          placeholder="e.g. Mackerel Plush"
        />
      </FormField>

      {/* Title JA + Brand */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <FormField label={locale === 'zh' ? '日文名' : locale === 'en' ? 'Japanese Title' : '日本語名'}>
          <input
            type="text"
            value={titleJa}
            onChange={e => setTitleJa(e.target.value)}
            style={inputStyle}
            placeholder="例: サバのぬいぐるみ"
          />
        </FormField>
        <FormField label={locale === 'zh' ? '品牌' : locale === 'en' ? 'Brand' : 'ブランド'}>
          <input
            type="text"
            value={brand}
            onChange={e => setBrand(e.target.value)}
            style={inputStyle}
            placeholder="e.g. Sanrio"
          />
        </FormField>
      </div>

      {/* Price + Original Price */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <FormField label={`${labels.price} *`} hint={labels.required}>
          <input
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            required
            min="1"
            style={inputStyle}
            placeholder="1000"
          />
        </FormField>
        <FormField label={labels.originalPrice}>
          <input
            type="number"
            value={originalPrice}
            onChange={e => setOriginalPrice(e.target.value)}
            min="1"
            style={inputStyle}
            placeholder="1500"
          />
        </FormField>
      </div>

      {/* Category + Source */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <FormField label={labels.category}>
          <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{categoryLabels[locale]?.[c] || c}</option>
            ))}
          </select>
        </FormField>
        <FormField label={labels.source}>
          <select value={source} onChange={e => setSource(e.target.value)} style={inputStyle}>
            {SOURCES.map(s => (
              <option key={s} value={s}>{sourceLabels[locale]?.[s] || s}</option>
            ))}
          </select>
        </FormField>
      </div>

      {/* Source URL */}
      <FormField label={labels.sourceUrl}>
        <input
          type="url"
          value={sourceUrl}
          onChange={e => setSourceUrl(e.target.value)}
          style={inputStyle}
          placeholder="https://..."
        />
      </FormField>

      {/* Images */}
      <FormField label={labels.images}>
        <textarea
          value={images}
          onChange={e => setImages(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
          placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
        />
      </FormField>

      {/* Stock + Weight */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <FormField label={labels.stock}>
          <input
            type="number"
            value={stock}
            onChange={e => setStock(e.target.value)}
            min="0"
            style={inputStyle}
          />
        </FormField>
        <FormField label={labels.weight}>
          <input
            type="number"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            min="1"
            style={inputStyle}
          />
        </FormField>
      </div>

      {/* Description */}
      <FormField label={labels.description}>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }}
          placeholder={locale === 'ja' ? '商品の説明文...' : locale === 'zh' ? '商品描述...' : 'Product description...'}
        />
      </FormField>

      {/* In stock toggle */}
      <div style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={inStock}
            onChange={e => setInStock(e.target.checked)}
            style={{ width: '16px', height: '16px' }}
          />
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
            {labels.inStock}：{inStock ? (locale === 'ja' ? 'あり' : locale === 'zh' ? '有货' : 'In Stock') : (locale === 'ja' ? 'なし' : locale === 'zh' ? '缺货' : 'Out of Stock')}
          </span>
        </label>
      </div>

      {/* Active toggle */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
            style={{ width: '16px', height: '16px' }}
          />
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
            {labels.isActive}：{isActive ? labels.active : labels.inactive}
          </span>
        </label>
      </div>

      {error && (
        <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: '#fef2f2', color: '#dc2626', fontSize: 'var(--text-sm)' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-3)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 'var(--space-2) var(--space-6)',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? labels.saving : labels.save}
        </button>
        <a
          href={`/${locale}/admin/products`}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          {labels.cancel}
        </a>
      </div>
    </form>
  );
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-2)' }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>({hint})</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)',
  fontSize: 'var(--text-sm)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
};
