import type { Metadata } from 'next';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = {
    ja: 'お問い合わせ',
    zh: '联系我们',
    en: 'Contact',
  };
  const descriptions: Record<string, string> = {
    ja: '袋鼠君へのお問い合わせはこちら。商品についてのご質問、ご注文に関するお問い合わせを受け付けています。',
    zh: '联系袋鼠君客服团队，获取商品咨询、订单问题等方面的帮助。',
    en: 'Get in touch with Kangaroo Shop. Contact us for product inquiries, order support, and general questions.',
  };
  return {
    title: titles[locale] ?? titles.en,
    description: descriptions[locale] ?? descriptions.en,
    alternates: {
      canonical: `https://kangaroo-shop-tan.vercel.app/${locale}/contact`,
    },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const labels = {
    title: locale === 'ja' ? 'お問い合わせ' : locale === 'zh' ? '联系我们' : 'Contact',
    email: 'contact@kangarookun.com',
  };
  return (
    <main className="container" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-16)' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>{labels.title}</h1>
      <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-secondary)' }}>
        {labels.email}
      </p>
    </main>
  );
}
