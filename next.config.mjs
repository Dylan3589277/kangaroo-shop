import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
  images: {
    remotePatterns: [
      // 白名单域名（生产环境建议保持最小化）
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // TODO: 如有其他图片域名需求，按需添加
      // 临时方案：保持全开放方便调试，上线前应确认所有图片来源并逐个加入白名单
      // { protocol: 'https', hostname: '**' },
    ],
  },
};

export default withNextIntl(nextConfig);
