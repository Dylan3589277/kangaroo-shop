import Link from 'next/link';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function CancelPage({ params }: Props) {
  const { locale } = await params;

  const labels = {
    ja: {
      title: '注文がキャンセルされました',
      sub: 'ご注文はキャンセルされました。もう一度ご注文される場合は、下のボタンからショッピングを続けください。',
      continueBtn: 'ショッピングを続ける',
      contact: 'お問い合わせ',
    },
    zh: {
      title: '订单已取消',
      sub: '您的订单已取消。如需重新下单，请点击下方按钮继续购物。',
      continueBtn: '继续购物',
      contact: '联系我们',
    },
    en: {
      title: 'Order Cancelled',
      sub: 'Your order has been cancelled. Click below to continue shopping.',
      continueBtn: 'Continue Shopping',
      contact: 'Contact Us',
    },
  };

  const t = labels[locale as keyof typeof labels] ?? labels.ja;

  return (
    <main style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-6)', maxWidth: 500, margin: '0 auto' }}>
      <div style={{ fontSize: '5rem', marginBottom: 'var(--space-4)' }}>🛒</div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)', color: 'var(--color-text)' }}>
        {t.title}
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-8)', lineHeight: 1.7 }}>
        {t.sub}
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href={`/${locale}/products`} className="btn btn-primary">
          {t.continueBtn}
        </Link>
        <Link href={`/${locale}/contact`} className="btn btn-secondary">
          {t.contact}
        </Link>
      </div>
    </main>
  );
}
