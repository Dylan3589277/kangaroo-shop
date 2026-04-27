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
    ja: '袋鼠君は日本と世界を繋ぐ跨境ECサイトです。Italian Brainrot IP製品を始めとする高品質な日本商品を海外へお届けします。',
    zh: '袋鼠君是连接日本与世界的跨境电商平台，将Italian Brainrot IP周边等优质日本商品带给海外消费者。',
    en: 'Kangaroo Kun is a cross-border e-commerce platform connecting Japan with the world, bringing quality Japanese products to global customers.',
  };
  return {
    title: titles[locale] ?? titles.en,
    description: descriptions[locale] ?? descriptions.en,
    alternates: {
      canonical: `https://kangaroo-shop-tan.vercel.app/${locale}/about`,
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
      ? '袋鼠君は、日本と世界を繋ぐ跨境ECサイトです。Italian Brainrot IP製品を始めとする質の高い日本商品を、海外の消費者にお届けします。'
      : locale === 'zh'
      ? '袋鼠君是连接日本与世界的跨境电商平台，将Italian Brainrot IP周边等优质日本商品带给海外消费者。'
      : 'Kangaroo Kun is a cross-border e-commerce platform connecting Japan and the world.',
  };
  return (
    <main className="container" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-16)' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>{labels.title}</h1>
      <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-secondary)', maxWidth: '700px' }}>{labels.desc}</p>
    </main>
  );
}
