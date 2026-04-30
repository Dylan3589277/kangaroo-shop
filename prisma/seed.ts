/**
 * Seed 脚本：将 MOCK_PRODUCTS 导入 Supabase PostgreSQL
 * 用法：npx prisma db seed
 * 需要先配置 DATABASE_URL 环境变量
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MOCK_PRODUCTS = [
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
    stock: 100,
    description: 'Italian Brainrot Tralarello 公式コラボレーションTシャツ。軽量Cotton100%、洗濯OK。',
    weight: 200,
    isActive: true,
  },
  {
    id: '2',
    title: 'Brr Brr ぬいぐるみセット Sサイズ',
    titleEn: 'Brr Brr Plush Set S',
    price: 4800,
    originalPrice: null,
    currency: 'JPY',
    images: ['https://placehold.co/600x600/e63946/FFF?text=BrrBrr+Plush'],
    category: 'brainrot',
    source: 'zozotown',
    sourceUrl: 'https://zozo.jp/',
    rating: 4.8,
    reviews: 64,
    inStock: true,
    stock: 50,
    description: 'Italian Brainrot キャラクター「Brr Brr」ぬいぐるみ。小さめサイズ、カバンにも付けられる。',
    weight: 350,
    isActive: true,
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
    stock: 200,
    description: 'Italian Brainrot「Cappuccino Flight」「Tralarello」イラスト入りエコバッグ。',
    weight: 80,
    isActive: true,
  },
  {
    id: '4',
    title: 'Cappuccino Flight 文化タオル',
    titleEn: 'Cappuccino Flight Towel',
    price: 980,
    originalPrice: null,
    currency: 'JPY',
    images: ['https://placehold.co/600x600/d4a574/FFF?text=Towel'],
    category: 'brainrot',
    source: 'rakuten',
    sourceUrl: null,
    rating: 4.6,
    reviews: 89,
    inStock: false,
    stock: 0,
    description: 'Italian Brainrot 超有名フレーズ「When you wake up, Cappuccino Flight is ready」タオル。',
    weight: 120,
    isActive: true,
  },
  {
    id: '5',
    title: 'Melona メロンブレッド ソックス',
    titleEn: 'Melona Melon Bread Socks',
    price: 1400,
    originalPrice: null,
    currency: 'JPY',
    images: ['https://placehold.co/600x600/f4a261/FFF?text=Melona+Socks'],
    category: 'brainrot',
    source: 'amazon',
    sourceUrl: null,
    rating: 4.3,
    reviews: 201,
    inStock: true,
    stock: 150,
    description: 'Italian Brainrot Melona（メロナ）パロディソックス。履くとMelonaの顔が乗りかかって可愛い。',
    weight: 60,
    isActive: true,
  },
  {
    id: '6',
    title: 'Tralarello スマホケース iPhone/Android',
    titleEn: 'Tralarello Phone Case',
    price: 2200,
    originalPrice: null,
    currency: 'JPY',
    images: ['https://placehold.co/600x600/1a1a1a/e63946?text=Phone+Case'],
    category: 'brainrot',
    source: 'rakuten',
    sourceUrl: null,
    rating: 4.4,
    reviews: 77,
    inStock: true,
    stock: 80,
    description: 'Tralarello イラスト入りスマホケース。Soft TPU素材、傷防止。',
    weight: 50,
    isActive: true,
  },
];

async function main() {
  console.log('🌱 开始 Seed 商品数据...');

  // 清理旧数据
  await prisma.orderItem.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();

  console.log('🗑️ 旧数据已清理');

  // 导入商品
  for (const product of MOCK_PRODUCTS) {
    await prisma.product.create({
      data: {
        id: product.id,
        title: product.title,
        titleEn: product.titleEn,
        price: product.price,
        originalPrice: product.originalPrice,
        currency: product.currency,
        images: product.images,
        category: product.category,
        source: product.source,
        sourceUrl: product.sourceUrl,
        rating: product.rating,
        reviews: product.reviews,
        inStock: product.inStock,
        stock: product.stock,
        description: product.description,
        weight: product.weight,
        isActive: product.isActive,
      },
    });
    console.log(`  ✅ 商品: ${product.title}`);
  }

  // 创建默认管理员账户（密码: kangaroo2024）
  // bcrypt hash for 'kangaroo2024' - in production, change this!
  const adminPasswordHash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // 'password' hash - placeholder
  await prisma.admin.upsert({
    where: { email: 'admin@kangaroo-shop.com' },
    update: {},
    create: {
      email: 'admin@kangaroo-shop.com',
      passwordHash: adminPasswordHash,
      name: '花哥',
      isActive: true,
    },
  });
  console.log('  ✅ 管理员账户: admin@kangaroo-shop.com (请修改密码!)');


  // 将前4个商品标记为首页推荐
  const featuredIds = ['1', '2', '3', '4'];
  for (let i = 0; i < featuredIds.length; i++) {
    await prisma.product.update({
      where: { id: featuredIds[i] },
      data: { isFeatured: true, featuredRank: i },
    });
  }
  console.log('  ✅ 已标记 4 个推荐商品');
  const count = await prisma.product.count();
  console.log(`\n🎉 Seed 完成！共导入 ${count} 个商品`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
