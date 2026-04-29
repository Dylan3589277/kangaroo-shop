import type { Metadata } from 'next';
import Link from 'next/link';
import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata({
  title: '404 - Page Not Found',
});

export default function NotFound() {
  return (
    <main style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-6)' }}>
      <div style={{ fontSize: '5rem', marginBottom: 'var(--space-4)' }}>🔍</div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)' }}>
        Page Not Found
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)' }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/" className="btn btn-primary">
        Back to Home
      </Link>
    </main>
  );
}
