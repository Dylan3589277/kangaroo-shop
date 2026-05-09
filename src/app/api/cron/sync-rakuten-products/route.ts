import { NextRequest, NextResponse } from 'next/server';
import { syncRakutenProductsFromRms } from '@/lib/rakuten-rms/products-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authorization = req.headers.get('authorization') || '';
  const bearerToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const headerToken = req.headers.get('x-cron-secret') || '';

  return bearerToken === secret || headerToken === secret;
}

async function handleCron(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET is not configured' },
      { status: 503 }
    );
  }

  if (!isAuthorized(req)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized cron request' },
      { status: 401 }
    );
  }

  const result = await syncRakutenProductsFromRms();

  return NextResponse.json({
    ok: true,
    ...result,
  });
}

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}
