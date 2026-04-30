import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ProductCard } from '@/components/features/ProductCard';
import { prisma } from '@/lib/prisma';
import { buildIndexableMetadata, SEO_BASE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const SLUG_CATEGORY_MAP: Record<string, { key: string; title: Record<string, string>; desc: Record<string, string>; keywords: string }> = {
  'tiktok-trending': {
    key: 'brainrot',
    title: { ja: 'TikTok話題の商品', zh: 'TikTok爆款', en: 'TikTok Trending' },
    desc: {
      ja: 'TikTokで話題のItalian Brainrotやミーム系グッズをセレクト。中国から調達し、日本・欧米を中心に世界へお届けします。',
      zh: '精选TikTok热门Italian Brainrot和梗图周边商品。从中国采购，面向日本、欧美与全球客户。',
      en: 'Curated TikTok-trending Italian Brainrot and meme goods. Sourced from China and shipped to Japan, Europe, North America and worldwide.',
    },
    keywords: 'TikTok trending, brainrot, meme goods, Italian Brainrot, 中国采购',
  },
  'anime-goods': {
    key: 'anime',
    title: { ja: 'アニメグッズ', zh: '动漫周边', en: 'Anime Goods' },
    desc: {
      ja: 'アニメファン必見のグッズをセレクト。中国で調達したコレクター向けアイテムを世界へ。',
      zh: '动漫迷必备周边商品。从中国采购的收藏级好物，面向全球动漫爱好者。',
      en: 'Must-have anime goods for collectors. Sourced from China for anime fans worldwide.',
    },
    keywords: 'anime goods, anime merchandise, アニメグッズ, collector items',
  },
  'baby-family': {
    key: 'baby',
    title: { ja: 'ベビー・ファミリー', zh: '母婴家庭', en: 'Baby & Family' },
    desc: {
      ja: '赤ちゃんと家族のためのアイテムを厳選。中国から調達した安心・安全な商品を世界へ。',
      zh: '为宝宝和家庭精选的好物。从中国采购的安全可靠商品，全球配送。',
      en: 'Curated baby and family essentials. Safe, quality products sourced from China for families worldwide.',
    },
    keywords: 'baby products, family goods, ベビー用品, 母婴',
  },
  'lifestyle-finds': {
    key: 'lifestyle',
    title: { ja: 'ライフスタイル雑貨', zh: '生活好物', en: 'Lifestyle Finds' },
    desc: {
      ja: 'おしゃれで実用的な生活雑貨をセレクト。中国から調達したトレンドアイテムを世界へ。',
      zh: '精选时尚实用的生活好物。从中国采购的潮流单品，面向全球消费者。',
      en: 'Stylish and practical lifestyle goods. Trending items sourced from China for global shoppers.',
    },
    keywords: 'lifestyle goods, home decor, 生活雑貨, トレンド',
  },
};

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const config = SLUG_CATEGORY_MAP[slug];
  if (!config) return buildIndexableMetadata({ locale, path: `/categories/${slug}`, title: 'Not Found' });

  return buildIndexableMetadata({
    locale,
    path: `/categories/${slug}`,
    title: config.title[locale] ?? config.title.en,
    description: config.desc[locale] ?? config.desc.en,
  });
}

export async function generateStaticParams() {
  return [];
}

export default async function CategoryPage({ params }: Props) {
  const { locale, slug } = await params;
  const config = SLUG_CATEGORY_MAP[slug];
  if (!config) notFound();

  const title = config.title[locale] ?? config.title.en;
  const description = config.desc[locale] ?? config.desc.en;
  const categoryKey = config.key;

  let products: Record<string, unknown>[] = [];
  try {
    products = (await prisma.product.findMany({
      where: { category: categoryKey, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })) as unknown as Record<string, unknown>[];
  } catch {
    // DB unavailable
  }

  const faq = [
    {
      qJa: '配送料はいくらですか？', qZh: '运费多少？', qEn: 'How much is shipping?',
      aJa: '日本国内はEconomy ¥500、Express ¥1,500。欧米は¥2,000〜。詳細はカートでご確認ください。',
      aZh: '日本国内Economy ¥500、Express ¥1,500。欧美¥2,000起。具体请在购物车确认。',
      aEn: 'Japan: Economy ¥500, Express ¥1,500. US/Europe: from ¥2,000. Check your cart for exact quote.',
    },
    {
      qJa: '支払い方法は？', qZh: '支付方式？', qEn: 'Payment methods?',
      aJa: 'Stripe（クレジットカード）とPayPalに対応しています。',
      aZh: '支持Stripe（信用卡）和PayPal支付。',
      aEn: 'We accept Stripe (credit cards) and PayPal.',
    },
    {
      qJa: '返品はできますか？', qZh: '可以退换吗？', qEn: 'Can I return items?',
      aJa: '未開封の商品は到着後7日以内に返品可能です。',
      aZh: '未开封商品可在到货后7天内退换。',
      aEn: 'Unopened items can be returned within 7 days of delivery.',
    },
  ];

  const t = (ja: string, zh: string, en: string) =>
    locale === 'ja' ? ja : locale === 'zh' ? zh : en;

  return (
    <main className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-16)' }}>
      {/* Breadcrumb JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: t('ホーム', '首页', 'Home'), item: `${SEO_BASE_URL}/${locale}` },
              { '@type': 'ListItem', position: 2, name: t('商品一覧', '商品列表', 'Products'), item: `${SEO_BASE_URL}/${locale}/products` },
              { '@type': 'ListItem', position: 3, name: title, item: `${SEO_BASE_URL}/${locale}/categories/${slug}` },
            ],
          }),
        }}
      />

      <div style={{ marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
        <Link href={`/${locale}`} style={{ color: 'var(--color-text-muted)' }}>{t('ホーム', '首页', 'Home')}</Link>
        <span style={{ margin: '0 8px' }}>›</span>
        <Link href={`/${locale}/products`} style={{ color: 'var(--color-text-muted)' }}>{t('商品一覧', '商品列表', 'Products')}</Link>
        <span style={{ margin: '0 8px' }}>›</span>
        <span>{title}</span>
      </div>

      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)' }}>
        {title}
      </h1>
      <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.8, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-8)', maxWidth: 700 }}>
        {description}
      </p>

      {/* Products */}
      {products.length > 0 ? (
        <div className="product-grid" style={{ marginBottom: 'var(--space-12)' }}>
          {products.map(product => (
            <ProductCard key={product.id as string} product={product as never} locale={locale} />
          ))}
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)' }}>
          {t('このカテゴリーの商品はまだありません', '该分类暂无商品', 'No products in this category yet')}
        </p>
      )}

      {/* FAQ */}
      <section style={{ maxWidth: 700, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-6)', borderBottom: '2px solid var(--color-primary)', paddingBottom: 'var(--space-2)' }}>
          FAQ
        </h2>
        {faq.map((item, i) => (
          <div key={i} style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
              {t(item.qJa, item.qZh, item.qEn)}
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              {t(item.aJa, item.aZh, item.aEn)}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
