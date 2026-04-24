export default function PrivacyPage() {
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
