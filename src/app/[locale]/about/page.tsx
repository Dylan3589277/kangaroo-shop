import type { Metadata } from 'next';
import { buildIndexableMetadata } from '@/lib/seo';

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
    ja: 'classeは、デザインと価格のバランスがよい日用品を世界のお客様へ届ける越境ECサイトです。',
    zh: 'classe是为全球用户精选有设计感、价格友好的日常好物的跨境电商平台。',
    en: 'classe curates design-conscious everyday finds with good value for global customers.',
  };
  return buildIndexableMetadata({
    locale,
    path: '/about',
    title: titles[locale] ?? titles.en,
    description: descriptions[locale] ?? descriptions.en,
  });
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
      ? 'classeは、デザインと価格のバランスがよい日用品を世界のお客様へ届ける越境ECサイトです。日本の代理購入サービスではありません。'
      : locale === 'zh'
      ? 'classe为全球用户精选有设计感、价格友好的日常好物。本站不是日本代拍站。'
      : 'classe curates design-conscious everyday finds with good value for global customers. It is not a Japan proxy-shopping service.',
  };
  return (
    <main className="container" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-16)' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>{labels.title}</h1>
      <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-secondary)', maxWidth: '700px' }}>{labels.desc}</p>
    </main>
  );
}
