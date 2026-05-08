import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { isNextDynamicServerUsage } from '@/lib/api-error';
import { buildIndexableMetadata } from '@/lib/seo';
import { prisma } from '@/lib/prisma';
import { formatPrice, parseProductImages } from '@/lib/products';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = {
    en: 'classe | Global good finds, delivered in one stop',
    zh: 'classe | 全球好物，一站直达',
    ja: 'classe | 世界の良品を、ワンストップでお届け',
    ko: 'classe | 전 세계 좋은 상품을 한 번에 배송',
    de: 'classe | Globale Lieblingsstücke, direkt geliefert',
    fr: 'classe | Les bonnes trouvailles du monde, livrées en un seul endroit',
    it: 'classe | Buoni prodotti dal mondo, consegnati in un unico shop',
    es: 'classe | Buenos productos del mundo, entrega en una sola tienda',
    th: 'classe | ของดีจากทั่วโลก ส่งตรงในที่เดียว',
    id: 'classe | Produk bagus dari seluruh dunia, dikirim dari satu tempat',
    vi: 'classe | Hàng tốt toàn cầu, giao trọn trong một điểm đến',
  };
  const descriptions: Record<string, string> = {
    ja: '世界の良品をワンストップで。暮らしに合うアイテムを世界へ届けます。',
    zh: '全球好物，一站直达。为全球用户精选价格友好的日常好物。',
    en: 'Global good finds in one convenient shop, curated for shoppers worldwide.',
  };
  return buildIndexableMetadata({
    locale,
    path: '',
    title: titles[locale] ?? titles.en,
    description: descriptions[locale] ?? descriptions.en,
  });
}

const CATEGORIES = [
  { key: 'brainrot', emoji: '🦴' },
  { key: 'anime', emoji: '🎌' },
  { key: 'baby', emoji: '👶' },
  { key: 'lifestyle', emoji: '🧸' },
] as const;

const TRUST_BADGES = [
  { key: 'china', emoji: '💎' },
  { key: 'global', emoji: '🌍' },
  { key: 'secure', emoji: '🔒' },
] as const;

async function getFeaturedProducts() {
  if (!process.env.DATABASE_URL) {
    console.warn('[HomePage] DATABASE_URL is not configured; rendering home without featured products.');
    return [];
  }

  try {
    return await prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      orderBy: { featuredRank: 'asc' },
      take: 8,
    });
  } catch (error) {
    if (isNextDynamicServerUsage(error)) {
      throw error;
    }

    console.error('[HomePage] Failed to load featured products; rendering fallback home.', error);
    return [];
  }
}


export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const featured = await getFeaturedProducts();

  const t = await getTranslations({ locale, namespace: 'home' });

  return (
    <main>
      {/* Hero */}
      <div className="container" style={{ paddingTop: 'var(--space-10)', paddingBottom: 'var(--space-10)' }}>
        <section className="hero">
          <h1 className="hero-title">{t('hero.title')}</h1>
          <p className="hero-subtitle">{t('hero.subtitle')}</p>
          <Link href="/products" className="btn btn-primary" style={{ fontSize: 'var(--text-base)', padding: '0.875rem 2.5rem' }}>
            {t('hero.cta')}
          </Link>
        </section>

        {/* Trust Badges */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-12)', maxWidth: 720, margin: '0 auto var(--space-12) auto' }}>
          {TRUST_BADGES.map((badge) => (
            <div key={badge.key} style={{ textAlign: 'center', padding: 'var(--space-4)', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: 'var(--space-2)' }}>{badge.emoji}</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                {t(`trust.${badge.key}`)}
              </div>
            </div>
          ))}
        </section>

        {/* Categories */}
        <section style={{ marginBottom: 'var(--space-12)' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-6)', textAlign: 'center' }}>
            {t('categories')}
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
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, color: 'var(--color-text)' }}>{t(`categoryLabels.${cat.key}`)}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        {featured.length > 0 && (
          <section style={{ marginBottom: 'var(--space-12)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-6)', textAlign: 'center' }}>
              {t('featured')}
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
                        <Link href={`/products/${product.id}`} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: 'var(--text-xs)' }}>
                          {t('shopNow')}
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
