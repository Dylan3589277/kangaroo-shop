import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-6)' }}>
      <div style={{ fontSize: '5rem', marginBottom: 'var(--space-4)' }}>🔍</div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)' }}>
        ページが見つかりません
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)' }}>
        お探しのページは存在しないか、移動された可能性があります。
      </p>
      <Link href="/" className="btn btn-primary">ホームに戻る</Link>
    </main>
  );
}
