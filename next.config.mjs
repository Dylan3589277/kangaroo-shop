import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // 白名单域名（生产环境建议保持最小化）
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '**.mercari.com' },
      { protocol: 'https', hostname: '**.rakuten.co.jp' },
      { protocol: 'https', hostname: '**.amazon.com' },
      { protocol: 'https', hostname: '**.amazon.co.jp' },
      { protocol: 'https', hostname: 'item-shopping.c.yimg.jp' },
      { protocol: 'https', hostname: 'thumbnail.image.rakuten.co.jp' },
      // 临时方案：保持全开放方便调试，上线前应确认所有图片来源并逐个加入白名单
      // { protocol: 'https', hostname: '**' },
    ],
  },
  // 安全 headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
