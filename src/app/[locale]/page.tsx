import type { Metadata } from 'next';
import { Link } from '@/i18n/routing';
import { buildIndexableMetadata } from '@/lib/seo';
import { prisma } from '@/lib/prisma';
import { formatPrice, parseProductImages } from '@/lib/products';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = {
    ja: '袋鼠君 | 中国調達から世界市場へ',
    zh: '袋鼠君 | 中国采购，卖往全球',
    en: 'Kangaroo Shop | China Sourcing for Global Markets',
  };
  const descriptions: Record<string, string> = {
    ja: '中国で調達・輸入した商品を、日本・欧米を中心に世界へ届ける越境ECサイト。',
    zh: '从中国采购/进口商品，面向日本、欧美等全球市场销售的跨境电商平台。',
    en: 'A cross-border commerce platform sourcing and importing products from China for Japan, Europe, North America and global markets.',
  };
  return buildIndexableMetadata({
    locale,
    path: '',
    title: titles[locale] ?? titles.en,
    description: descriptions[locale] ?? descriptions.en,
  });
}

const CATEGORIES = [
  { key: 'brainrot', label: 'Italian Brainrot', emoji: '🦴' },
  { key: 'anime', label: 'アニメ', emoji: '🎌' },
  { key: 'baby', label: 'ベビー用品', emoji: '👶' },
  { key: 'lifestyle', label: 'ライフスタイル', emoji: '🧸' },
];


export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const featured = await prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    orderBy: { featuredRank: 'asc' },
    take: 8,
  });

  const labels = {
    heroTitle: locale === 'ja' ? '中国調達から世界市場へ' : locale === 'zh' ? '中国采购，卖往全球' : 'China Sourcing for Global Markets',
    heroSub: locale === 'ja' ? '中国で調達・輸入した商品を、日本・欧米を中心に世界へ届けます' : locale === 'zh' ? '从中国采购/进口商品，面向日本、欧美等全球市场销售' : 'Products sourced and imported from China for Japan, Europe, North America and beyond',
    cta: locale === 'ja' ? '商品を見る' : locale === 'zh' ? '查看商品' : 'Browse Products',
    featured: locale === 'ja' ? 'おすすめ商品' : locale === 'zh' ? '推荐商品' : 'Featured',
    categories: locale === 'ja' ? 'カテゴリー' : locale === 'zh' ? '分类' : 'Categories',
    shopNow: locale === 'ja' ? '今すぐ購入' : locale === 'zh' ? '立即购买' : 'Shop Now',
  };

  return (
    <main>
      {/* Hero */}
      <div className="container" style={{ paddingTop: 'var(--space-10)', paddingBottom: 'var(--space-10)' }}>
        <section className="hero">
          <h1 className="hero-title">{labels.heroTitle}</h1>
          <p className="hero-subtitle">{labels.heroSub}</p>
          <Link href="/products" className="btn btn-primary" style={{ fontSize: 'var(--text-base)', padding: '0.875rem 2.5rem' }}>
            {labels.cta}
          </Link>
        </section>

        {/* Trust Badges */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-12)', maxWidth: 720, margin: '0 auto var(--space-12) auto' }}>
          {[
            { emoji: '🇨🇳', ja: '中国サプライチェーンから厳選', zh: '中国供应链精选', en: 'Curated from China' },
            { emoji: '🌍', ja: '日本・欧米へ配送対応', zh: '支持日本、欧美配送', en: 'Ships Worldwide' },
            { emoji: '🔒', ja: 'Stripe・PayPal 安全決済', zh: 'Stripe · PayPal 安全支付', en: 'Secure Checkout' },
          ].map((badge) => (
            <div key={badge.en} style={{ textAlign: 'center', padding: 'var(--space-4)', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 'var(--space-2)' }}>{badge.emoji}</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                {locale === 'ja' ? badge.ja : locale === 'zh' ? badge.zh : badge.en}
              </div>
            </div>
          ))}
        </section>

        {/* Categories */}
        <section style={{ marginBottom: 'var(--space-12)' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-6)', textAlign: 'center' }}>
            {labels.categories}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.key}
                href={`/products?category=${cat.key}`}
                className="card"
                style={{ textAlign: 'center', textDecoration: 'none', padding: 'var(--space-8) var(--space-4)' }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>{cat.emoji}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, color: 'var(--color-text)' }}>{cat.label}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        {featured.length > 0 && (
          <section style={{ marginBottom: 'var(--space-12)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-6)', textAlign: 'center' }}>
              {labels.featured}
            </h2>
            <div className="product-grid">
              {featured.map((product) => {
                const images = parseProductImages(product.images);
                const imgSrc = images[0] ?? 'https://placehold.co/400x400/F5F0E8/8B0000?text=No+Image';
                return (
                  <article key={product.id} className="card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgSrc} alt={product.title} className="card-image" style={{ aspectRatio: '1/1', objectFit: 'cover', background: 'var(--color-bg-alt)' }} />
                    <div className="card-body">
                      <h3 className="card-title">{product.title}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-3)' }}>
                        <span className="card-price">{formatPrice(product.price)}</span>
                        <Link href={`/${locale}/products/${product.id}`} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: 'var(--text-xs)' }}>
                          {labels.shopNow}
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
