import { Metadata } from 'next';
import ProductForm from '../ProductForm';

export const metadata: Metadata = { title: '新規商品 | classe' };

export default function NewProductPage() {
  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>新規商品作成</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-1)', fontSize: 'var(--text-sm)' }}>
          商品情報を入力してください
        </p>
      </div>
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)' }}>
        <ProductForm isNew={true} locale="ja" />
      </div>
    </div>
  );
}
