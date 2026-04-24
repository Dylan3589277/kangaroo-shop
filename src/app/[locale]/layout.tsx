import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, Locale, Link } from '@/i18n/routing';
import { CartProvider } from '@/contexts/CartContext';
import { NavbarCart } from '@/components/features/NavbarCart';
import './globals.css';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <CartProvider>
          <NextIntlClientProvider messages={messages}>
            {/* 导航栏 */}
            <header className="navbar">
              <div className="navbar-inner">
                <Link href="/" className="navbar-logo">
                  袋鼠君
                </Link>
                <nav>
                  <ul className="navbar-nav">
                    <li><Link href="/">{locale === 'ja' ? 'ホーム' : locale === 'zh' ? '首页' : 'Home'}</Link></li>
                    <li><Link href="/products">{locale === 'ja' ? '商品' : locale === 'zh' ? '商品' : 'Products'}</Link></li>
                    <li><Link href="/about">{locale === 'ja' ? '会社概要' : locale === 'zh' ? '关于我们' : 'About'}</Link></li>
                    <li><Link href="/contact">{locale === 'ja' ? 'お問い合わせ' : locale === 'zh' ? '联系' : 'Contact'}</Link></li>
                  </ul>
                </nav>
                <div className="flex items-center gap-4">
                  <NavbarCart />
                </div>
              </div>
            </header>

            {/* 页面内容 */}
            {children}

            {/* 页脚 */}
            <footer className="footer">
              <div className="footer-content">
                <div>
                  <div className="footer-title">袋鼠君</div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 0 }}>
                    {locale === 'ja' ? '日本から世界へ、厳選商品をお届け' : locale === 'zh' ? '从日本到世界，精选好物' : 'From Japan to the World'}
                  </p>
                </div>
                <div>
                  <div className="footer-title">{locale === 'ja' ? 'クイックリンク' : locale === 'zh' ? '快速链接' : 'Quick Links'}</div>
                  <ul className="footer-links">
                    <li><Link href="/">{locale === 'ja' ? 'ホーム' : locale === 'zh' ? '首页' : 'Home'}</Link></li>
                    <li><Link href="/products">{locale === 'ja' ? '商品一覧' : locale === 'zh' ? '商品列表' : 'Products'}</Link></li>
                    <li><Link href="/about">{locale === 'ja' ? '会社概要' : locale === 'zh' ? '关于我们' : 'About'}</Link></li>
                  </ul>
                </div>
                <div>
                  <div className="footer-title">{locale === 'ja' ? '法的情報' : locale === 'zh' ? '法律信息' : 'Legal'}</div>
                  <ul className="footer-links">
                    <li><Link href="/privacy">{locale === 'ja' ? 'プライバシーポリシー' : locale === 'zh' ? '隐私政策' : 'Privacy'}</Link></li>
                    <li><Link href="/terms">{locale === 'ja' ? '利用規約' : locale === 'zh' ? '使用条款' : 'Terms'}</Link></li>
                  </ul>
                </div>
              </div>
              <div className="footer-bottom">
                © 2024 袋鼠君 All Rights Reserved.
              </div>
            </footer>
          </NextIntlClientProvider>
        </CartProvider>
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
