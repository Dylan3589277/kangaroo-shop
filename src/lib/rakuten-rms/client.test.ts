import { type Mock, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RakutenRmsClient, createRakutenRmsClient } from './client';
import {
  RakutenRmsConfigError,
  RakutenRmsPathError,
  RakutenRmsReadOnlyError,
} from './types';

// ─── helpers ────────────────────────────────────────────────────────────────

function setValidEnv() {
  process.env.RAKUTEN_SERVICE_SECRET = 'svc-secret-123';
  process.env.RAKUTEN_LICENSE_KEY = 'lic-key-456';
  process.env.RAKUTEN_RMS_READ_ONLY = 'true';
}

function clearEnv() {
  delete process.env.RAKUTEN_SERVICE_SECRET;
  delete process.env.RAKUTEN_LICENSE_KEY;
  delete process.env.RAKUTEN_RMS_READ_ONLY;
  delete process.env.RAKUTEN_RMS_BASE_URL;
}

/** Build a minimal fetch mock that returns 200 JSON. */
function makeFetchMock(body: unknown = {}, status = 200): Mock & typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as Mock & typeof fetch;
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('RakutenRmsClient — read-only guard', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'throws RakutenRmsReadOnlyError for %s before touching config',
    async (method) => {
      // Do NOT set env — if the guard fires, config is never loaded.
      const client = new RakutenRmsClient(makeFetchMock());
      await expect(client.request(method, '/any')).rejects.toThrow(
        RakutenRmsReadOnlyError
      );
    }
  );

  it('the error message names the forbidden method', async () => {
    const client = new RakutenRmsClient(makeFetchMock());
    await expect(client.request('POST', '/any')).rejects.toThrow('POST');
  });

  it('does NOT throw for GET', async () => {
    setValidEnv();
    const fetchMock = makeFetchMock({ items: [] });
    const client = new RakutenRmsClient(fetchMock);
    const result = await client.get('/product/search');
    expect(result.ok).toBe(true);
  });
});

describe('RakutenRmsClient — RAKUTEN_RMS_READ_ONLY guard', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('throws RakutenRmsConfigError when RAKUTEN_RMS_READ_ONLY is not "true"', async () => {
    process.env.RAKUTEN_SERVICE_SECRET = 'ss';
    process.env.RAKUTEN_LICENSE_KEY = 'lk';
    process.env.RAKUTEN_RMS_READ_ONLY = 'false';

    const client = new RakutenRmsClient(makeFetchMock());
    await expect(client.get('/search')).rejects.toThrow(RakutenRmsConfigError);
  });

  it('throws when RAKUTEN_RMS_READ_ONLY is absent', async () => {
    process.env.RAKUTEN_SERVICE_SECRET = 'ss';
    process.env.RAKUTEN_LICENSE_KEY = 'lk';
    // RAKUTEN_RMS_READ_ONLY intentionally absent

    const client = new RakutenRmsClient(makeFetchMock());
    await expect(client.get('/search')).rejects.toThrow(RakutenRmsConfigError);
  });
});

describe('RakutenRmsClient — Authorization header', () => {
  beforeEach(() => {
    clearEnv();
    setValidEnv();
  });
  afterEach(clearEnv);

  it('sends an Authorization header on GET requests', async () => {
    const fetchMock = makeFetchMock({});
    const client = new RakutenRmsClient(fetchMock);
    await client.get('/search');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBeDefined();
    expect(headers['Authorization'].startsWith('ESA ')).toBe(true);
  });

  it('does not let caller-supplied headers override Authorization', async () => {
    const fetchMock = makeFetchMock({});
    const client = new RakutenRmsClient(fetchMock);
    await client.get('/search', {
      headers: { Authorization: 'Bearer attacker-supplied-token' },
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBeDefined();
    expect(headers['Authorization'].startsWith('ESA ')).toBe(true);
    expect(headers['Authorization']).not.toBe('Bearer attacker-supplied-token');
  });

  it('Authorization header is NOT returned in the response object', async () => {
    const fetchMock = makeFetchMock({ ok: true });
    const client = new RakutenRmsClient(fetchMock);
    const result = await client.get('/search');
    const json = JSON.stringify(result);
    expect(json).not.toContain('ESA ');
  });

  it('raw secrets never appear in the Authorization header value (only base64)', () => {
    // The base64 of "svc-secret-123:lic-key-456" should be what travels.
    // Raw secret strings must not be present literally.
    const fetchMock = makeFetchMock({});
    const client = new RakutenRmsClient(fetchMock);

    return client.get('/search').then(() => {
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      const authValue = headers['Authorization'];
      expect(authValue).not.toContain('svc-secret-123');
      expect(authValue).not.toContain('lic-key-456');
    });
  });
});

describe('RakutenRmsClient — missing config', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('throws RakutenRmsConfigError when secrets are missing', async () => {
    const client = new RakutenRmsClient(makeFetchMock());
    await expect(client.get('/search')).rejects.toThrow(RakutenRmsConfigError);
  });
});

describe('RakutenRmsClient — HTTP behaviour', () => {
  beforeEach(() => {
    clearEnv();
    setValidEnv();
  });
  afterEach(clearEnv);

  it('appends query params to the URL', async () => {
    const fetchMock = makeFetchMock({ items: [] });
    const client = new RakutenRmsClient(fetchMock);
    await client.get('/search', { params: { keyword: 'shoes', hits: '10' } });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('keyword=shoes');
    expect(url).toContain('hits=10');
  });

  it('keeps the /es/2.0 base path when request path starts with slash', async () => {
    const fetchMock = makeFetchMock({ items: [] });
    const client = new RakutenRmsClient(fetchMock);
    await client.get('/items/search', { params: { hits: '10' } });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://api.rms.rakuten.co.jp/es/2.0/items/search?hits=10'
    );
  });

  it('rejects absolute URLs before touching config', async () => {
    clearEnv();
    const client = new RakutenRmsClient(makeFetchMock());
    await expect(client.get('https://attacker.example/collect')).rejects.toThrow(
      RakutenRmsPathError
    );
  });

  it('rejects protocol-relative URLs before touching config', async () => {
    clearEnv();
    const client = new RakutenRmsClient(makeFetchMock());
    await expect(client.get('//attacker.example/collect')).rejects.toThrow(
      RakutenRmsPathError
    );
  });

  it.each([
    '\\\\attacker.example\\collect',
    '/\\attacker.example/collect',
    '/product/%5Cattacker',
  ])('rejects backslash-based path escapes before touching config: %s', async (path) => {
    clearEnv();
    const client = new RakutenRmsClient(makeFetchMock());
    await expect(client.get(path)).rejects.toThrow(RakutenRmsPathError);
  });

  it.each([
    '../evil',
    './search',
    '/api/../../../evil',
    '/product/../inventory',
    '/product/%2e%2e/inventory',
    '/product/%2E/inventory',
  ])('rejects dot-segment path escapes before touching config: %s', async (path) => {
    clearEnv();
    const client = new RakutenRmsClient(makeFetchMock());
    await expect(client.get(path)).rejects.toThrow(RakutenRmsPathError);
  });

  it('rejects malformed percent-encoded paths before touching config', async () => {
    clearEnv();
    const client = new RakutenRmsClient(makeFetchMock());
    await expect(client.get('/product/%E0%A4%A')).rejects.toThrow(
      RakutenRmsPathError
    );
  });

  it('returns ok:false for non-2xx responses', async () => {
    const fetchMock = makeFetchMock({ error: 'not found' }, 404);
    const client = new RakutenRmsClient(fetchMock);
    const result = await client.get('/missing');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
  });

  it('converts HTML error pages into safe structured data', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      text: async () => '<!DOCTYPE html><html><body>not found</body></html>',
    }) as unknown as Mock & typeof fetch;
    const client = new RakutenRmsClient(fetchMock);
    const result = await client.get('/wrong-path');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.data).toMatchObject({
      error: 'Rakuten RMS returned a non-JSON response.',
      contentType: 'text/html; charset=utf-8',
      bodySnippet: expect.stringContaining('<!DOCTYPE html>'),
    });
  });

  it('passes signal through to fetch', async () => {
    const fetchMock = makeFetchMock({});
    const client = new RakutenRmsClient(fetchMock);
    const controller = new AbortController();
    await client.get('/search', { signal: controller.signal });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBe(controller.signal);
  });
});

describe('createRakutenRmsClient', () => {
  beforeEach(() => {
    clearEnv();
    setValidEnv();
  });
  afterEach(clearEnv);

  it('returns a RakutenRmsClient instance', () => {
    expect(createRakutenRmsClient(makeFetchMock())).toBeInstanceOf(
      RakutenRmsClient
    );
  });
});
