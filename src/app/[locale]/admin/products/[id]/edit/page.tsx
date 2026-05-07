import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ProductForm from '../../ProductForm';
import { parseProductImages } from '@/lib/products';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  return { title: product ? `${product.title} | classe` : '商品を編集 | classe' };
}

export default async function EditProductPage({ params }: Props) {
  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) notFound();

  const locale = 'ja';

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>商品を編集</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-1)', fontSize: 'var(--text-sm)' }}>
          商品ID: {params.id}
        </p>
      </div>
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)' }}>
        <ProductForm
          isNew={false}
          locale={locale}
          product={{
            id: product.id,
            title: product.title,
            titleEn: product.titleEn ?? undefined,
            price: Number(product.price),
            originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
            images: parseProductImages(product.images),
            category: product.category ?? 'brainrot',
            source: product.source ?? 'own',
            sourceUrl: product.sourceUrl ?? undefined,
            rating: product.rating ?? undefined,
            reviews: product.reviews ?? undefined,
            inStock: product.inStock ?? true,
            stock: product.stock ?? 0,
            description: product.description ?? undefined,
            weight: product.weight ?? undefined,
            isActive: product.isActive ?? true,
          }}
        />
      </div>
    </div>
  );
}
