import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { GET } from './route';
import { requireAdminSession } from '@/lib/admin-auth';

vi.mock('@/lib/admin-auth', () => ({
  requireAdminSession: vi.fn(),
}));

function setValidEnv() {
  process.env.RAKUTEN_SERVICE_SECRET = 'test-service-secret';
  process.env.RAKUTEN_LICENSE_KEY = 'test-license-key';
  process.env.RAKUTEN_RMS_READ_ONLY = 'true';
}

function clearEnv() {
  delete process.env.RAKUTEN_SERVICE_SECRET;
  delete process.env.RAKUTEN_LICENSE_KEY;
  delete process.env.RAKUTEN_RMS_READ_ONLY;
  delete process.env.RAKUTEN_RMS_BASE_URL;
  delete process.env.RAKUTEN_RMS_PROBE_PATH;
}

describe('GET /api/admin/system/rakuten-rms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearEnv();
    vi.mocked(requireAdminSession).mockResolvedValue({ response: null, session: null });
  });

  it('requires an admin session before returning config status', async () => {
    const unauthorized = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    vi.mocked(requireAdminSession).mockResolvedValueOnce({ response: unauthorized, session: null });

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it('returns configured:false when Rakuten RMS env vars are absent', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.configured).toBe(false);
    expect(body.error).toBeNull();
  });

  it('returns only masked config and never exposes raw secrets', async () => {
    setValidEnv();

    const response = await GET();
    const body = await response.json();
    const json = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.data.configured).toBe(true);
    expect(body.data.serviceSecretMasked).toContain('*');
    expect(body.data.licenseKeyMasked).toContain('*');
    expect(json).not.toContain('test-service-secret');
    expect(json).not.toContain('test-license-key');
    expect(json).not.toContain('ESA ');
  });
});
