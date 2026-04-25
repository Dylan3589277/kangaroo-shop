import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { MOCK_PRODUCTS, formatPrice, parseProductImages } from '@/lib/products';
import { AddToCartButton } from '@/components/features/AddToCartButton';
import { ProductReviews } from '@/components/features/ProductReviews';
import { WishlistButton } from '@/components/features/WishlistButton';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ProductDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const product = MOCK_PRODUCTS.find(p => p.id === id);

  if (!product) notFound();

  const labels = {
    ja: {
      addToCart: 'カートに追加', price: '価格', rating: '評価', reviews: '件のレビュー',
      inStock: '在庫あり', outOfStock: '在庫切れ', source: '販売元', size: 'サイズ',
      weight: '重量', description: '商品説明', relatedProducts: 'おすすめ商品',
      back: '← 商品一覧に戻る', addedToCart: 'カートに追加しました！',
    },
    zh: {
      addToCart: '加入购物车', price: '价格', rating: '评分', reviews: '条评论',
      inStock: '有库存', outOfStock: '缺货', source: '销售方', size: '尺寸',
      weight: '重量', description: '商品说明', relatedProducts: '相关推荐',
      back: '← 返回商品列表', addedToCart: '已加入购物车！',
    },
    en: {
      addToCart: 'Add to Cart', price: 'Price', rating: 'Rating', reviews: 'reviews',
      inStock: 'In Stock', outOfStock: 'Out of Stock', source: 'Source', size: 'Size',
      weight: 'Weight', description: 'Description', relatedProducts: 'Related Products',
      back: '← Back to Products', addedToCart: 'Added to cart!',
    },
  };
  const t = labels[locale as keyof typeof labels] ?? labels.ja;

  const sourceLabel: Record<string, string> = {
    rakuten: '楽天市場', zozotown: 'ZOZO', amazon: 'Amazon', mercari: 'メルカリ', own: '自社商品',
  };

  const related = MOCK_PRODUCTS.filter(p => p.category === product.category && p.id !== product.id).slice(0, 3);

  const infoRows = [
    { label: product.inStock ? t.inStock : t.outOfStock, value: product.inStock ? t.inStock : t.outOfStock, color: product.inStock ? 'var(--color-success)' : 'var(--color-error)' },
    ...(product.size ? [{ label: t.size, value: product.size, color: undefined }] : []),
    ...(product.weight ? [{ label: t.weight, value: `${product.weight}g`, color: undefined }] : []),
    { label: t.source, value: sourceLabel[product.source ?? 'own'] ?? product.source ?? 'own', color: undefined },
  ];

  return (
    <main className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-16)' }}>
      {/* 面包屑 */}
      <div style={{ marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
        <Link href={`/${locale}/products`} style={{ color: 'var(--color-text-muted)' }}>
          {locale === 'ja' ? 'ホーム' : locale === 'zh' ? '首页' : 'Home'}
        </Link>
        <span style={{ margin: '0 8px' }}>›</span>
        <Link href={`/${locale}/products`} style={{ color: 'var(--color-text-muted)' }}>
          {locale === 'ja' ? '商品一覧' : locale === 'zh' ? '商品列表' : 'Products'}
        </Link>
        <span style={{ margin: '0 8px' }}>›</span>
        <span>{product.title}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)', marginBottom: 'var(--space-12)' }}>
        {/* 左：图片 */}
        <div>
          <div style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--color-bg-alt)', marginBottom: 'var(--space-3)' }}>
            <Image
              src={parseProductImages(product.images)[0]}
              alt={product.title}
              fill
              style={{ objectFit: 'contain' }}
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '0.7rem', padding: '3px 8px', borderRadius: 4 }}>
              {sourceLabel[product.source ?? 'own'] ?? product.source ?? 'own'}
            </div>
          </div>
          {parseProductImages(product.images).length > 1 && (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {parseProductImages(product.images).map((img, i) => (
                <div key={i} style={{ position: 'relative', width: 72, height: 72, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: i === 0 ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', cursor: 'pointer' }}>
                  <Image src={img} alt="" fill style={{ objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右：商品信息 */}
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', fontWeight: 500, marginBottom: 'var(--space-3)', lineHeight: 1.4 }}>
            {product.title}
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            {product.titleEn}
          </p>

          {/* 评分 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-5)' }}>
            <span style={{ color: '#f59e0b', fontSize: '1rem' }}>
              {'★'.repeat(Math.round(product.rating ?? 0))}{'☆'.repeat(5 - Math.round(product.rating ?? 0))}
            </span>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{product.rating}</span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>({product.reviews}{t.reviews})</span>
          </div>

          {/* 价格 */}
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-primary)' }}>
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-muted)', textDecoration: 'line-through', marginLeft: 12 }}>
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>

          {/* 标签 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
            {(product.tags ?? []).map(tag => (
              <span key={tag} className="badge">{tag}</span>
            ))}
          </div>

          {/* 信息列表 */}
          <div style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4)', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-sm)' }}>
            {infoRows.map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>{item.label}</span>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: item.color ?? 'var(--color-text)' }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <AddToCartButton product={product} locale={locale} />
            <WishlistButton productId={product.id} locale={locale} />
          </div>

          {product.sourceUrl && product.sourceUrl !== '#' && (
            <a
              href={product.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', marginTop: 'var(--space-3)', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', textDecoration: 'underline' }}
            >
              {locale === 'ja' ? '元の商品を見る' : locale === 'zh' ? '查看原商品' : 'View Original'} →
            </a>
          )}
        </div>
      </div>

      {/* 商品说明 */}
      <section style={{ marginBottom: 'var(--space-12)', maxWidth: 700 }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-4)', borderBottom: '2px solid var(--color-primary)', paddingBottom: 'var(--space-2)' }}>
          {t.description}
        </h2>
        <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}>
          {product.description}
        </p>
      </section>

      {/* 商品评价 */}
      <ProductReviews productId={product.id} locale={locale} initialReviewCount={product.reviews ?? 0} />

      {/* 相关商品 */}
      {related.length > 0 && (
        <section>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-6)', textAlign: 'center' }}>
            {t.relatedProducts}
          </h2>
          <div className="product-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {related.map(p => (
              <Link key={p.id} href={`/${locale}/products/${p.id}`} className="card" style={{ textDecoration: 'none' }}>
                <div style={{ position: 'relative', aspectRatio: '1/1' }}>
                  <Image src={parseProductImages(p.images)[0]} alt={p.title} fill style={{ objectFit: 'cover' }} />
                </div>
                <div className="card-body">
                  <h3 className="card-title">{p.title}</h3>
                  <span className="card-price">{formatPrice(p.price)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export async function generateStaticParams() {
  return MOCK_PRODUCTS.map(p => ({ id: p.id }));
}
