import type { Metadata } from 'next';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = {
    ja: 'お気に入り',
    zh: '我的收藏',
    en: 'Wishlist',
  };
  return {
    title: titles[locale] ?? titles.en,
    alternates: {
      canonical: `https://kangaroo-shop-tan.vercel.app/${locale}/wishlist`,
    },
  };
}

// The actual wishlist page content remains unchanged — it's a client component
export { default } from './WishlistClient';
