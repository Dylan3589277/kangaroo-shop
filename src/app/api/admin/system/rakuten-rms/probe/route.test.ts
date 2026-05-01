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

describe('GET /api/admin/system/rakuten-rms/probe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    clearEnv();
    vi.mocked(requireAdminSession).mockResolvedValue({ response: null, session: null });
  });

  it('requires an admin session before probing', async () => {
    const unauthorized = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    vi.mocked(requireAdminSession).mockResolvedValueOnce({ response: unauthorized, session: null });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks probing when RAKUTEN_RMS_PROBE_PATH is not configured', async () => {
    setValidEnv();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.data.probed).toBe(false);
    expect(body.data.reason).toContain('RAKUTEN_RMS_PROBE_PATH');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses only server-side configured probe path and returns no raw API body or secrets', async () => {
    setValidEnv();
    process.env.RAKUTEN_RMS_PROBE_PATH = '/product/2/search';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ rawSecretFromApiBody: 'should-not-be-returned' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET();
    const body = await response.json();
    const json = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.data.probed).toBe(true);
    expect(body.data.ok).toBe(true);
    expect(body.data.status).toBe(200);
    expect(json).not.toContain('test-service-secret');
    expect(json).not.toContain('test-license-key');
    expect(json).not.toContain('ESA ');
    expect(json).not.toContain('should-not-be-returned');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.rms.rakuten.co.jp/es/1.0/product/2/search');
    expect(init.method).toBe('GET');
  });

  it('rejects unsafe probe paths before fetch is called', async () => {
    setValidEnv();
    process.env.RAKUTEN_RMS_PROBE_PATH = 'https://attacker.example/collect';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET();
    const body = await response.json();
    const json = JSON.stringify(body);

    expect(response.status).toBe(400);
    expect(body.data.probed).toBe(false);
    expect(body.error.type).toBe('RakutenRmsPathError');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(json).not.toContain('test-service-secret');
    expect(json).not.toContain('test-license-key');
    expect(json).not.toContain('ESA ');
  });
});
