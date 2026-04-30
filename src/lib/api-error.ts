import { NextResponse } from 'next/server';

const IS_DEV = process.env.NODE_ENV !== 'production';

function isNextDynamicServerUsage(err: unknown): boolean {
  return typeof err === 'object'
    && err !== null
    && 'digest' in err
    && (err as { digest?: unknown }).digest === 'DYNAMIC_SERVER_USAGE';
}

/**
 * Sanitized 500 handler.
 * - Production: returns generic "Internal server error" to avoid leaking stack traces / DB messages.
 * - Development: returns the raw message so debugging is easy.
 * - Always console.error the original error server-side.
 * - Re-throws Next.js dynamic server usage bailout signals so build/static generation can handle them.
 * Does NOT suppress 400/401/403/404 — those are returned directly by each handler.
 */
export function serverError(err: unknown, body?: Record<string, unknown>): NextResponse {
  if (isNextDynamicServerUsage(err)) {
    throw err;
  }

  console.error('[API] Internal error:', err);
  const devMessage = err instanceof Error ? err.message : String(err);
  return NextResponse.json(
    body ?? { error: IS_DEV ? devMessage : 'Internal server error' },
    { status: 500 }
  );
}
