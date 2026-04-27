import type { Metadata } from 'next';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = {
    ja: 'カート',
    zh: '购物车',
    en: 'Cart',
  };
  return {
    title: titles[locale] ?? titles.en,
    alternates: {
      canonical: `https://kangaroo-shop-tan.vercel.app/${locale}/cart`,
    },
  };
}

// The actual cart page content remains unchanged — it's a client component
export { default } from './CartClient';
