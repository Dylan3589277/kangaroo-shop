

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const labels = {
    title: locale === 'ja' ? 'お問い合わせ' : locale === 'zh' ? '联系我们' : 'Contact',
    email: 'contact@kangarookun.com',
  };
  return (
    <main className="container" style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-16)' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)' }}>{labels.title}</h1>
      <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-secondary)' }}>
        {labels.email}
      </p>
    </main>
  );
}
