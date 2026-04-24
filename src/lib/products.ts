import { Prisma } from '@prisma/client';

export type JsonValue = Prisma.JsonValue;

export interface Product {
  id: string;
  title: string;
  titleEn?: string | null;
  price: number;
  originalPrice?: number | null;
  currency?: string;
  images: string[] | JsonValue;
  category?: string;
  source?: string;
  sourceUrl?: string | null;
  rating?: number;
  reviews?: number;
  inStock?: boolean;
  description?: string | null;
  size?: string;
  tags?: string[];
  weight?: number;
}

/**
 * Prisma JsonValue → string[]（安全解析 product.images）
 * 用于从 Prisma 查询返回的 JSON 字段（MySQL Json 类型映射为 JsonValue）
 */
export function parseProductImages(images: unknown): string[] {
  if (!images) return [];
  if (Array.isArray(images)) return images as string[];
  try {
    const parsed = typeof images === 'string' ? JSON.parse(images) : images;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    title: 'Tralarello コラボ Tシャツ 黒',
    titleEn: 'Tralarello Collab T-Shirt Black',
    price: 3200,
    originalPrice: 4800,
    currency: 'JPY',
    images: [
      'https://placehold.co/600x600/1a1a1a/FFF?text=Tralarello+TS',
      'https://placehold.co/600x600/333/FFF?text=Back',
    ],
    category: 'brainrot',
    source: 'rakuten',
    sourceUrl: 'https://www.rakuten.co.jp/',
    rating: 4.5,
    reviews: 128,
    inStock: true,
    description: 'Italian Brainrot Tralarello 公式コラボレーションTシャツ。軽量Cotton100%、洗濯OK。',
    size: 'M',
    weight: 200,
  },
  {
    id: '2',
    title: 'Brr Brr ぬいぐるみセット Sサイズ',
    titleEn: 'Brr Brr Plush Set S',
    price: 4800,
    currency: 'JPY',
    images: ['https://placehold.co/600x600/e63946/FFF?text=BrrBrr+Plush'],
    category: 'brainrot',
    source: 'zozotown',
    sourceUrl: 'https://zozo.jp/',
    rating: 4.8,
    reviews: 64,
    inStock: true,
    description: 'Italian Brainrot キャラクター「Brr Brr」ぬいぐるみ。小さめサイズ、カバンにも付けられる。',
    weight: 350,
  },
  {
    id: '3',
    title: 'Mamma Mia エコバッグ',
    titleEn: 'Mamma Mia Eco Bag',
    price: 1200,
    originalPrice: 1600,
    currency: 'JPY',
    images: ['https://placehold.co/600x600/457b9d/FFF?text=EcoBag'],
    category: 'brainrot',
    source: 'mercari',
    sourceUrl: 'https://mercari.com/',
    rating: 4.2,
    reviews: 312,
    inStock: true,
    description: 'Italian Brainrot「Cappuccino Flight」「Tralarello」イラスト入りエコバッグ。',
    weight: 80,
  },
  {
    id: '4',
    title: 'Cappuccino Flight 文化タオル',
    titleEn: 'Cappuccino Flight Towel',
    price: 980,
    currency: 'JPY',
    images: ['https://placehold.co/600x600/d4a574/FFF?text=Towel'],
    category: 'brainrot',
    source: 'rakuten',
    rating: 4.6,
    reviews: 89,
    inStock: false,
    description: 'Italian Brainrot 超有名フレーズ「When you wake up, Cappuccino Flight is ready」タオル。',
    weight: 120,
  },
  {
    id: '5',
    title: 'Melona メロンブレッド ソックス',
    titleEn: 'Melona Melon Bread Socks',
    price: 1400,
    currency: 'JPY',
    images: ['https://placehold.co/600x600/f4a261/FFF?text=Melona+Socks'],
    category: 'brainrot',
    source: 'amazon',
    rating: 4.3,
    reviews: 201,
    inStock: true,
    description: 'Italian Brainrot Melona（メロナ）パロディソックス。履くとMelonaの顔が乗りかかって可愛い。',
    weight: 60,
  },
  {
    id: '6',
    title: 'Tralarello スマホケース iPhone/Android',
    titleEn: 'Tralarello Phone Case',
    price: 2200,
    currency: 'JPY',
    images: ['https://placehold.co/600x600/1a1a1a/e63946?text=Phone+Case'],
    category: 'brainrot',
    source: 'rakuten',
    rating: 4.4,
    reviews: 77,
    inStock: true,
    description: 'Tralarello イラスト入りスマホケース。Soft TPU素材、傷防止。',
    weight: 50,
  },
];

export function formatPrice(price: number, currency = 'JPY'): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}
