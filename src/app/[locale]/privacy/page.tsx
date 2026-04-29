import type { Metadata } from 'next';
import { buildIndexableMetadata } from '@/lib/seo';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = {
    ja: 'プライバシーポリシー',
    zh: '隐私政策',
    en: 'Privacy Policy',
  };
  return buildIndexableMetadata({
    locale,
    path: '/privacy',
    title: titles[locale] ?? titles.en,
  });
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (locale === 'en') {
    return (
      <main className="container" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-16)', maxWidth: 800 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>Privacy Policy</h1>
        <div style={{ fontSize: 'var(--text-base)', lineHeight: 2, color: 'var(--color-text-secondary)' }}>
          <p style={{ marginBottom: 'var(--space-4)' }}>Kangaroo Shop (hereinafter referred to as &ldquo;we&rdquo;) recognizes the importance of protecting your personal information and establishes the following privacy policy.</p>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>Article 1. Definition of Personal Information</h2>
          <p style={{ marginBottom: 'var(--space-4)' }}>Personal information refers to information that can identify an individual, such as name, email address, and shipping address.</p>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>Article 2. Collection of Personal Information</h2>
          <p style={{ marginBottom: 'var(--space-4)' }}>We collect necessary personal information (name, address, contact details) when you purchase products.</p>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>Article 3. Use of Personal Information</h2>
          <p style={{ marginBottom: 'var(--space-4)' }}>Collected personal information is used solely for product shipping, inquiry responses, and payment processing.</p>
        </div>
      </main>
    );
  }

  if (locale === 'zh') {
    return (
      <main className="container" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-16)', maxWidth: 800 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>隐私政策</h1>
        <div style={{ fontSize: 'var(--text-base)', lineHeight: 2, color: 'var(--color-text-secondary)' }}>
          <p style={{ marginBottom: 'var(--space-4)' }}>袋鼠君（以下简称&ldquo;我们&rdquo;）认识到保护用户个人信息的重要性，并制定如下隐私政策。</p>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>第一条 个人信息的定义</h2>
          <p style={{ marginBottom: 'var(--space-4)' }}>个人信息是指姓名、电子邮件地址、配送地址等可以识别个人的信息。</p>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>第二条 个人信息的收集</h2>
          <p style={{ marginBottom: 'var(--space-4)' }}>我们在您购买商品时，收集必要的个人信息（姓名、地址、联系方式）。</p>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>第三条 个人信息的使用</h2>
          <p style={{ marginBottom: 'var(--space-4)' }}>收集的个人信息仅用于商品配送、咨询回复和支付处理。</p>
        </div>
      </main>
    );
  }

  // Default: Japanese
  return (
    <main className="container" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-16)', maxWidth: 800 }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>プライバシーポリシー</h1>
      <div style={{ fontSize: 'var(--text-base)', lineHeight: 2, color: 'var(--color-text-secondary)' }}>
        <p style={{ marginBottom: 'var(--space-4)' }}>袋鼠君（以下、「当店」）は、ユーザーの個人情報の保護重要性を認識し、以下のようにプライバシーポリシーを定めます。</p>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>第1条 個人情報の定義</h2>
        <p style={{ marginBottom: 'var(--space-4)' }}>個人情報とは、氏名・メールアドレス・配送先住所等、個人を特定できる情報のことを言います。</p>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>第2条 個人情報の収集</h2>
        <p style={{ marginBottom: 'var(--space-4)' }}>当店は、商品のご購入時に必要な個人情報（氏名・住所・連絡先）を収集いたします。</p>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>第3条 個人情報の利用</h2>
        <p style={{ marginBottom: 'var(--space-4)' }}>収集した個人情報は、商品の発送・お問い合わせ対応・決済処理にのみ使用いたします。</p>
      </div>
    </main>
  );
}
