import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice, parseProductImages } from '@/lib/products';
import { AddToCartButton } from '@/components/features/AddToCartButton';
import { ProductReviews } from '@/components/features/ProductReviews';
import { WishlistButton } from '@/components/features/WishlistButton';
import { prisma } from '@/lib/prisma';
import { ShareButtons } from '@/components/features/ShareButtons';
import {
  buildAbsoluteUrl,
  buildIndexableMetadata,
  buildNoIndexMetadata,
  SEO_BASE_URL,
  toAbsoluteImageUrls,
} from '@/lib/seo';

interface Params {
  locale: string;
  id: string;
}

interface Props {
  params: Promise<Params>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;

  const product = await prisma.product.findUnique({
    where: { id, isActive: true },
    select: { title: true, description: true, images: true, price: true },
  });

  if (!product) {
    return buildNoIndexMetadata({ title: 'Product Not Found' });
  }

  const title = product.title;
  const description = product.description
    ? product.description.slice(0, 160)
    : `Shop ${title} at Kangaroo Shop. Products sourced and imported from China for global markets.`;
  const ogImage = `/og/${id}`;

  return buildIndexableMetadata({
    locale,
    path: `/products/${id}`,
    title,
    description,
    extra: {
      openGraph: {
        title: `${title} | Kangaroo Shop`,
        description,
        images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} | Kangaroo Shop`,
        description,
        images: [ogImage],
      },
    },
  });
}

export default async function ProductDetailPage({ params }: Props) {
  const { locale, id } = await params;

  // Fetch real product from database via Prisma (supports UUID IDs)
  const product = await prisma.product.findUnique({
    where: { id, isActive: true },
  });

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

  // Fetch related products from same category
  const related = await prisma.product.findMany({
    where: {
      category: product.category,
      isActive: true,
      id: { not: product.id },
    },
    take: 3,
    orderBy: { createdAt: 'desc' },
  });

  const infoRows = [
    { label: product.inStock ? t.inStock : t.outOfStock, value: product.inStock ? t.inStock : t.outOfStock, color: product.inStock ? 'var(--color-success)' : 'var(--color-error)' },
    ...(product.weight ? [{ label: t.weight, value: `${product.weight}g`, color: undefined }] : []),
    { label: t.source, value: sourceLabel[product.source ?? 'own'] ?? product.source ?? 'own', color: undefined },
  ];

  const images = parseProductImages(product.images);
  const absoluteImages = toAbsoluteImageUrls(images);
  const productUrl = buildAbsoluteUrl(`/${locale}/products/${product.id}`);

  // JSON-LD: BreadcrumbList
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: locale === 'ja' ? 'ホーム' : locale === 'zh' ? '首页' : 'Home',
        item: `${SEO_BASE_URL}/${locale}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: locale === 'ja' ? '商品一覧' : locale === 'zh' ? '商品列表' : 'Products',
        item: `${SEO_BASE_URL}/${locale}/products`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.title,
        item: productUrl,
      },
    ],
  };

  // JSON-LD: Product Schema
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || product.title,
    image: absoluteImages.length > 0 ? absoluteImages : undefined,
    url: productUrl,
    offers: {
      '@type': 'Offer',
      price: product.price.toString(),
      priceCurrency: 'JPY',
      itemCondition: 'https://schema.org/NewCondition',
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: productUrl,
      seller: {
        '@type': 'Organization',
        name: 'Kangaroo Shop',
      },
    },
    ...(product.rating
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating.toString(),
            reviewCount: product.reviews.toString(),
          },
        }
      : {}),
    brand: {
      '@type': 'Brand',
      name: product.source ? sourceLabel[product.source] || product.source : 'Kangaroo Shop',
    },
    sku: product.id,
  };

  const discountPct = product.originalPrice && product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    <main className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-16)' }}>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      {/* Responsive CSS */}
      <style>{`
        .pdp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-12); }
        @media (max-width: 768px) {
          .pdp-grid { grid-template-columns: 1fr; gap: var(--space-6); }
          .pdp-cta { position: sticky; bottom: 0; background: var(--color-surface); padding: var(--space-4); box-shadow: 0 -2px 12px rgba(0,0,0,0.08); border-top: 1px solid var(--color-border); margin: 0 calc(-1 * var(--space-4)); }
          .pdp-cta-inner { display: flex; flex-direction: column; gap: var(--space-2); }
        }
        @media (min-width: 769px) {
          .pdp-cta { margin-top: var(--space-5); }
          .pdp-cta-inner { display: flex; gap: var(--space-3); }
        }
      `}</style>

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

      <div className="pdp-grid" style={{ marginBottom: 'var(--space-12)' }}>
        {/* 左：图片 */}
        <div>
          <div style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--color-bg-alt)', marginBottom: 'var(--space-3)' }}>
            <Image
              src={images[0]}
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
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {images.map((img, i) => (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-primary)' }}>
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <>
                  <span style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                    {formatPrice(product.originalPrice)}
                  </span>
                  <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.03em' }}>
                    -{discountPct}%
                  </span>
                </>
              )}
            </div>
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
          <div className="pdp-cta">
            <div className="pdp-cta-inner">
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

          {/* 信任卖点横幅 */}
          <div style={{
            display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)',
            flexWrap: 'wrap',
          }}>
            {[
              { icon: '🔒', ja: '安心決済', zh: '安全支付', en: 'Secure Pay' },
              { icon: '📦', ja: '迅速配送', zh: '快速发货', en: 'Fast Ship' },
              { icon: '🔄', ja: '7日返品', zh: '7天退换', en: '7-Day Return' },
              { icon: '🛡', ja: '品質保証', zh: '品质保证', en: 'Quality' },
            ].map(b => (
              <div key={b.en} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: '0.72rem', color: 'var(--color-text-muted)',
                background: 'var(--color-bg-alt)', borderRadius: 4, padding: '4px 10px',
              }}>
                <span>{b.icon}</span>
                <span>{locale === 'ja' ? b.ja : locale === 'zh' ? b.zh : b.en}</span>
              </div>
            ))}
          </div>
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

      {/* 种草内容区 */}
      <div style={{ maxWidth: 700, marginBottom: 'var(--space-12)' }}>
        {/* 推荐理由 */}
        <section style={{ padding: 16, background: '#f9f9f9', borderRadius: 8, marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', marginBottom: 8 }}>
            {locale === 'ja' ? 'おすすめポイント' : locale === 'zh' ? '推荐理由' : 'Why you will like it'}
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}>
            {(product.description ?? '').slice(0, 200)}
          </p>
        </section>

        {/* 适合谁 */}
        <section style={{ padding: 16, background: '#f9f9f9', borderRadius: 8, marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', marginBottom: 8 }}>
            {locale === 'ja' ? 'こんな方におすすめ' : locale === 'zh' ? '适合谁' : 'Good for'}
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}>
            {(() => {
              const cat = product.category ?? '';
              const map: Record<string, { ja: string; zh: string; en: string }> = {
                brainrot: { ja: 'ミーム好き・TikTokユーザー', zh: '梗图爱好者·TikTok用户', en: 'Meme lovers, TikTok fans' },
                anime:    { ja: 'アニメファン・コレクター',   zh: '动漫迷·收藏者',          en: 'Anime fans, collectors' },
                baby:     { ja: '新米パパママ・出産祝い',     zh: '新手父母·母婴送礼',       en: 'New parents, baby gifts' },
                lifestyle: { ja: '生活雑貨好き・プレゼント探し', zh: '生活好物爱好者·送礼', en: 'Home lovers, gift seekers' },
              };
              const entry = map[cat] ?? map.lifestyle;
              return locale === 'ja' ? entry.ja : locale === 'zh' ? entry.zh : entry.en;
            })()}
          </p>
        </section>

        {/* 配送说明 */}
        <section style={{ padding: 16, background: '#f9f9f9', borderRadius: 8, marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', marginBottom: 8 }}>
            {locale === 'ja' ? '配送について' : locale === 'zh' ? '配送说明' : 'Shipping'}
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}>
            {locale === 'ja'
              ? '日本全国配送（Economy ¥500、Express ¥1,500）・欧米（¥2,000〜）・その他地域も対応'
              : locale === 'zh'
              ? '日本全国配送·欧美（¥2,000起）·其他地区可咨询'
              : 'Ships to Japan, US/Europe (from ¥2,000) and worldwide'}
          </p>
        </section>

        {/* 安心支付 */}
        <section style={{ padding: 16, background: '#f9f9f9', borderRadius: 8, marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', marginBottom: 8 }}>
            {locale === 'ja' ? '安心のお支払い' : locale === 'zh' ? '安心支付' : 'Secure Payment'}
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}>
            {locale === 'ja'
              ? 'Stripe・PayPalに対応'
              : locale === 'zh'
              ? '支持Stripe和PayPal安全支付'
              : 'Secure checkout with Stripe & PayPal'}
          </p>
        </section>

        {/* 退换说明 */}
        <section style={{ padding: 16, background: '#f9f9f9', borderRadius: 8, marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', marginBottom: 8 }}>
            {locale === 'ja' ? '返品・交換について' : locale === 'zh' ? '退换说明' : 'Returns'}
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}>
            {locale === 'ja'
              ? '未開封の商品は到着後7日以内返品可能'
              : locale === 'zh'
              ? '未开封商品7天内可退换'
              : 'Unopened items returnable within 7 days'}
          </p>
        </section>

        <ShareButtons url={productUrl} title={product.title} locale={locale} />
      </div>

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

// 强制动态渲染（避免 build 时 Prisma 无法连接数据库）
export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  // Skip pre-rendering at build time — product pages are rendered on demand
  return [];
}
