import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { GET } from './route';
import { syncRakutenProductsFromRms } from '@/lib/rakuten-rms/products-sync';

vi.mock('@/lib/rakuten-rms/products-sync', () => ({
  syncRakutenProductsFromRms: vi.fn(),
}));

function cronRequest(headers?: Record<string, string>): NextRequest {
  return new Request('http://localhost/api/cron/sync-rakuten-products', {
    method: 'GET',
    headers,
  }) as NextRequest;
}

describe('GET /api/cron/sync-rakuten-products', () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  afterEach(() => {
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
  });

  it('rejects unauthorized cron requests without calling Rakuten RMS sync', async () => {
    const response = await GET(cronRequest({ authorization: 'Bearer wrong' }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({ ok: false, error: 'Unauthorized cron request' });
    expect(syncRakutenProductsFromRms).not.toHaveBeenCalled();
  });

  it('calls Rakuten RMS sync for authorized cron requests', async () => {
    vi.mocked(syncRakutenProductsFromRms).mockResolvedValue({
      syncJobId: 'job-1',
      created: 2,
      updated: 1,
      skipped: 0,
      errors: 0,
      syncedAt: '2026-05-08T20:00:00.000Z',
    });

    const response = await GET(cronRequest({ authorization: 'Bearer test-cron-secret' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(syncRakutenProductsFromRms).toHaveBeenCalledTimes(1);
    expect(body).toEqual({
      ok: true,
      syncJobId: 'job-1',
      created: 2,
      updated: 1,
      skipped: 0,
      errors: 0,
      syncedAt: '2026-05-08T20:00:00.000Z',
    });
  });
});
