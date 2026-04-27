import type { Metadata } from 'next';
import { Link } from '@/i18n/routing';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = {
    ja: '袋鼠君 | 日本から世界へ',
    zh: '袋鼠君 | 从日本到世界',
    en: 'Kangaroo Shop | From Japan to the World',
  };
  const descriptions: Record<string, string> = {
    ja: '厳選された日本商品を海外へ。Italian Brainrot、アニメグッズ、ベビー用品、ライフスタイル商品を取り扱う跨境ECサイト。',
    zh: '精选日本商品，全球直邮。Italian Brainrot周边、动漫周边、母婴用品、生活用品跨境购物平台。',
    en: 'Discover curated Japanese products shipped worldwide. Italian Brainrot collectibles, anime goods, baby products, and lifestyle items — all from Japan.',
  };
  return {
    title: titles[locale] ?? titles.en,
    description: descriptions[locale] ?? descriptions.en,
    alternates: {
      canonical: `https://kangaroo-shop-tan.vercel.app/${locale}`,
    },
  };
}

const CATEGORIES = [
  { key: 'brainrot', label: 'Italian Brainrot', emoji: '🦴' },
  { key: 'anime', label: 'アニメ', emoji: '🎌' },
  { key: 'baby', label: 'ベビー用品', emoji: '👶' },
  { key: 'lifestyle', label: 'ライフスタイル', emoji: '🧸' },
];

const FEATURED_PRODUCTS = [
  { id: 1, title: 'Tralarello コラボTシャツ', price: '¥3,200', img: 'https://placehold.co/400x400/F5F0E8/8B0000?text=Tralarello' },
  { id: 2, title: 'Brr Brr ぬいぐるみセット', price: '¥4,800', img: 'https://placehold.co/400x400/F5F0E8/8B0000?text=BrrBrr' },
  { id: 3, title: 'Mamma Mia エコバッグ', price: '¥1,200', img: 'https://placehold.co/400x400/F5F0E8/8B0000?text=MammaMia' },
  { id: 4, title: 'Cappuccino 文化タオル', price: '¥980', img: 'https://placehold.co/400x400/F5F0E8/8B0000?text=Cappuccino' },
];

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const labels = {
    heroTitle: locale === 'ja' ? '日本から世界へ' : locale === 'zh' ? '从日本到世界' : 'From Japan to the World',
    heroSub: locale === 'ja' ? '厳選された日本商品を、海外の方へ' : locale === 'zh' ? '精选日本商品，海外直邮送达' : 'Carefully selected Japanese products, shipped worldwide',
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
        <section style={{ marginBottom: 'var(--space-12)' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-6)', textAlign: 'center' }}>
            {labels.featured}
          </h2>
          <div className="product-grid">
            {FEATURED_PRODUCTS.map((product) => (
              <article key={product.id} className="card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.img} alt={product.title} className="card-image" style={{ aspectRatio: '1/1', objectFit: 'cover', background: 'var(--color-bg-alt)' }} />
                <div className="card-body">
                  <h3 className="card-title">{product.title}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-3)' }}>
                    <span className="card-price">{product.price}</span>
                    <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: 'var(--text-xs)' }}>
                      {labels.shopNow}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
