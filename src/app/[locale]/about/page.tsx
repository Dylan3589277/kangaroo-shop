import type { Metadata } from 'next';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = {
    ja: '会社概要',
    zh: '关于我们',
    en: 'About Us',
  };
  const descriptions: Record<string, string> = {
    ja: '袋鼠君は中国で商品を調達・輸入し、日本・欧米を中心に世界へ販売する越境ECサイトです。',
    zh: '袋鼠君是从中国采购/进口商品，并面向日本、欧美与全球市场销售的跨境电商平台。',
    en: 'Kangaroo Shop sources and imports products from China, then sells them to Japan, Europe, North America and global markets.',
  };
  return {
    title: titles[locale] ?? titles.en,
    description: descriptions[locale] ?? descriptions.en,
    alternates: {
      canonical: `https://kangaroo-shop-orpin.vercel.app/${locale}/about`,
    },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const labels = {
    title: locale === 'ja' ? '会社概要' : locale === 'zh' ? '关于我们' : 'About Us',
    desc: locale === 'ja'
      ? '袋鼠君は、中国で商品を調達・輸入し、日本・欧米を中心とした世界の消費者へ届ける越境ECサイトです。日本の代理購入サービスではありません。'
      : locale === 'zh'
      ? '袋鼠君从中国采购/进口商品，并面向日本、欧美等全球市场销售。本站不是日本代拍站。'
      : 'Kangaroo Shop sources and imports products from China for global customers, with Japan, Europe and North America as key markets. It is not a Japan proxy-shopping service.',
  };
  return (
    <main className="container" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-16)' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>{labels.title}</h1>
      <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-secondary)', maxWidth: '700px' }}>{labels.desc}</p>
    </main>
  );
}
