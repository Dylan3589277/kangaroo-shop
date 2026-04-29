import type { Metadata } from 'next';
import { buildIndexableMetadata } from '@/lib/seo';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = {
    ja: '利用規約',
    zh: '使用条款',
    en: 'Terms of Service',
  };
  return buildIndexableMetadata({
    locale,
    path: '/terms',
    title: titles[locale] ?? titles.en,
  });
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (locale === 'en') {
    return (
      <main className="container" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-16)', maxWidth: 800 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>Terms of Service</h1>
        <div style={{ fontSize: 'var(--text-base)', lineHeight: 2, color: 'var(--color-text-secondary)' }}>
          <p style={{ marginBottom: 'var(--space-4)' }}>These Terms of Service govern your use of the Kangaroo Shop website and services.</p>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>Article 1. Application</h2>
          <p style={{ marginBottom: 'var(--space-4)' }}>These terms apply to all users of our services.</p>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>Article 2. Shipping</h2>
          <p style={{ marginBottom: 'var(--space-4)' }}>Products will be shipped within 3–7 business days after order confirmation.</p>
        </div>
      </main>
    );
  }

  if (locale === 'zh') {
    return (
      <main className="container" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-16)', maxWidth: 800 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>使用条款</h1>
        <div style={{ fontSize: 'var(--text-base)', lineHeight: 2, color: 'var(--color-text-secondary)' }}>
          <p style={{ marginBottom: 'var(--space-4)' }}>本使用条款规定了您使用袋鼠君网站和服务的条件。</p>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>第一条 适用</h2>
          <p style={{ marginBottom: 'var(--space-4)' }}>本条款适用于我们服务的所有用户。</p>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>第二条 配送</h2>
          <p style={{ marginBottom: 'var(--space-4)' }}>商品将在订单确认后3-7个工作日内发货。</p>
        </div>
      </main>
    );
  }

  // Default: Japanese
  return (
    <main className="container" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-16)', maxWidth: 800 }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>利用規約</h1>
      <div style={{ fontSize: 'var(--text-base)', lineHeight: 2, color: 'var(--color-text-secondary)' }}>
        <p style={{ marginBottom: 'var(--space-4)' }}>この利用規約（以下、「本規約」）は、袋鼠君（以下、「当店」）が提供するサービスの利用条件を定めます。</p>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>第1条 適用</h2>
        <p style={{ marginBottom: 'var(--space-4)' }}>本規約は、当店のサービス利用者に適用されます。</p>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>第2条 商品の発送</h2>
        <p style={{ marginBottom: 'var(--space-4)' }}>商品はご注文確認後、3〜7営業日以内に発送いたします。</p>
      </div>
    </main>
  );
}
