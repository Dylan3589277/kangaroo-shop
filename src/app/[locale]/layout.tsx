import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, Locale, Link } from '@/i18n/routing';
import { CartProvider } from '@/contexts/CartContext';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { NavbarCart } from '@/components/features/NavbarCart';
import { LanguageSwitcher } from '@/components/features/LanguageSwitcher';
import { TawkToWidget } from '@/components/support/TawkToWidget';
import { AnalyticsProvider } from '@/components/analytics/AnalyticsProvider';
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
  const nav = await getTranslations({ locale, namespace: 'nav' });
  const footer = await getTranslations({ locale, namespace: 'footer' });

  return (
    <html lang={locale}>
      <body>
        <CartProvider>
          <NextIntlClientProvider messages={messages}>
            {/* 导航栏 */}
            <header className="navbar">
              <div className="navbar-inner">
                <Link href="/" className="navbar-logo">
                  <BrandLogo slogan={footer('tagline')} />
                </Link>
                <nav>
                  <ul className="navbar-nav">
                    <li><Link href="/">{nav('home')}</Link></li>
                    <li><Link href="/products">{nav('products')}</Link></li>
                    <li><Link href="/about">{nav('about')}</Link></li>
                    <li><Link href="/contact">{nav('contact')}</Link></li>
                  </ul>
                </nav>
                <div className="navbar-actions">
                  <LanguageSwitcher />
                  <Link href="/wishlist" style={{ fontSize: 'var(--text-lg)' }} aria-label={nav('wishlist')}>❤️</Link>
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
                  <div className="footer-brand">
                    <BrandLogo slogan={footer('tagline')} />
                  </div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 0 }}>
                    {footer('tagline')}
                  </p>
                </div>
                <div>
                  <div className="footer-title">{footer('quickLinks')}</div>
                  <ul className="footer-links">
                    <li><Link href="/">{nav('home')}</Link></li>
                    <li><Link href="/products">{nav('products')}</Link></li>
                    <li><Link href="/about">{nav('about')}</Link></li>
                    <li><Link href="/help">{footer('help')}</Link></li>
                  </ul>
                </div>
                <div>
                  <div className="footer-title">{footer('legal')}</div>
                  <ul className="footer-links">
                    <li><Link href="/privacy">{footer('privacy')}</Link></li>
                    <li><Link href="/terms">{footer('terms')}</Link></li>
                  </ul>
                </div>
              </div>
              <div className="footer-bottom">
                {footer('copyright')}
              </div>
            </footer>
            <TawkToWidget />
            <AnalyticsProvider />
          </NextIntlClientProvider>
        </CartProvider>
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
