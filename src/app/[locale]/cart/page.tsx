import type { Metadata } from 'next';
import { buildNoIndexMetadata } from '@/lib/seo';

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
  return buildNoIndexMetadata({
    title: titles[locale] ?? titles.en,
  });
}

// The actual cart page content remains unchanged — it's a client component
export { default } from './CartClient';
