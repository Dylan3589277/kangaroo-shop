import type { Metadata } from 'next';
import { buildNoIndexMetadata } from '@/lib/seo';

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
  return buildNoIndexMetadata({
    title: titles[locale] ?? titles.en,
  });
}

// The actual wishlist page content remains unchanged — it's a client component
export { default } from './WishlistClient';
