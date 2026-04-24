export default function TermsPage() {
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
