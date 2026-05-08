import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { POST } from './route';
import { requireAdminSession } from '@/lib/admin-auth';

vi.mock('@/lib/admin-auth', () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock('@/lib/product-ai-copy', () => ({
  generateProductAiCopy: vi.fn(async () => ({ status: 'skipped', message: 'test' })),
}));

vi.mock('@/lib/product-image-download', () => ({
  PRODUCT_IMAGE_STORAGE: 'test',
  localizeProductImages: vi.fn(),
}));

function jsonRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/admin/product-url-preview', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as NextRequest;
}

function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
  });
}

function redirectResponse(location: string): Response {
  return new Response('', {
    status: 302,
    headers: { location },
  });
}

describe('POST /api/admin/product-url-preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.mocked(requireAdminSession).mockResolvedValue({ response: null, session: null });
  });

  it('requires an admin session before fetching product pages', async () => {
    const unauthorized = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    vi.mocked(requireAdminSession).mockResolvedValueOnce({ response: unauthorized, session: null });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(jsonRequest({ url: 'https://www.amazon.co.jp/dp/B000000000' }));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses validated Rakuten pc target from short links before fetching', async () => {
    const rakutenHtml = `
      <html>
        <head>
          <meta property="og:title" content="楽天テスト商品">
          <meta property="og:image" content="https://image.rakuten.co.jp/shop/cabinet/item.jpg">
        </head>
        <body><span class="price2">3,300円</span></body>
      </html>
    `;
    const fetchMock = vi.fn().mockResolvedValue(htmlResponse(rakutenHtml));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(jsonRequest({
      url: 'https://a.r10.to/hExample?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fshop%2Fitem%2F',
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe('https://item.rakuten.co.jp/shop/item/');
    expect(body.preview.sourceUrl).toBe('https://item.rakuten.co.jp/shop/item/');
    expect(body.preview.title).toBe('楽天テスト商品');
  });

  it('canonicalizes Rakuten item URLs with tracking params before fetching', async () => {
    const rakutenHtml = `
      <html>
        <head>
          <meta property="og:title" content="靴下テスト商品">
          <meta property="og:image" content="https://image.rakuten.co.jp/classe17/cabinet/socks003.jpg">
        </head>
        <body><span class="price2">1,280円</span></body>
      </html>
    `;
    const fetchMock = vi.fn().mockResolvedValue(htmlResponse(rakutenHtml));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(jsonRequest({
      url: 'https://item.rakuten.co.jp/classe17/socks003/?s-id=top_normal_browsehist&xuseflg_ichiba01=10000037',
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe('https://item.rakuten.co.jp/classe17/socks003/');
    expect(body.preview.sourceUrl).toBe('https://item.rakuten.co.jp/classe17/socks003/');
    expect(body.preview.title).toBe('靴下テスト商品');
  });

  it('canonicalizes Amazon product URLs with tracking params before fetching', async () => {
    const amazonHtml = `
      <html>
        <head>
          <meta property="og:title" content="Amazonテスト商品">
          <meta property="og:image" content="https://m.media-amazon.com/images/I/main._AC_SL1500_.jpg">
        </head>
        <body><span class="a-price-whole">3,780</span></body>
      </html>
    `;
    const fetchMock = vi.fn().mockResolvedValue(htmlResponse(amazonHtml));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(jsonRequest({
      url: 'https://www.amazon.co.jp/Pocket-%E7%B2%BE%E5%AF%86/dp/B0GZJF3NF2/ref=sr_1_7?keywords=DJI&qid=1778239986&sr=8-7',
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe('https://www.amazon.co.jp/dp/B0GZJF3NF2');
    expect(body.preview.sourceUrl).toBe('https://www.amazon.co.jp/dp/B0GZJF3NF2');
    expect(body.preview.title).toBe('Amazonテスト商品');
  });

  it('rejects unsafe Rakuten pc targets before fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(jsonRequest({
      url: 'https://a.r10.to/hExample?pc=https%3A%2F%2F127.0.0.1%2Fadmin',
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: 'UNSUPPORTED_URL',
      category: 'unsupported_url',
      reason: expect.any(String),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the final redirected Amazon URL and rejects non-product pages as unusable preview', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(redirectResponse('https://www.amazon.co.jp/dp/B000000000'))
      .mockResolvedValueOnce(htmlResponse('<html><head><title>ページが見つかりません</title></head><body>not found</body></html>'));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(jsonRequest({ url: 'https://amzn.asia/d/example' }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error).toContain('商品信息');
    expect(body).toMatchObject({
      code: 'PARSE_EMPTY',
      category: 'parse_empty',
      reason: expect.stringContaining('平台错误页'),
      diagnostics: {
        source: 'amazon',
        finalUrl: 'https://www.amazon.co.jp/dp/B000000000',
        contentType: 'text/html; charset=utf-8',
        htmlBytes: expect.any(Number),
        htmlTitle: 'ページが見つかりません',
        classification: 'platform_error_or_missing_product',
      },
    });
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual([
      'https://amzn.asia/d/example',
      'https://www.amazon.co.jp/dp/B000000000',
    ]);
  });

  it('classifies anti-bot empty previews and redacts final URL query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(htmlResponse(`
      <html>
        <head><title>Robot Check</title></head>
        <body>Enter the characters you see below to continue automated access check.</body>
      </html>
    `));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(jsonRequest({ url: 'https://www.amazon.co.jp/dp/B000000000?tag=secret' }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toMatchObject({
      code: 'PARSE_EMPTY',
      category: 'parse_empty',
      diagnostics: {
        finalUrl: 'https://www.amazon.co.jp/dp/B000000000',
        htmlTitle: 'Robot Check',
        classification: 'anti_bot_or_captcha',
      },
    });
    expect(JSON.stringify(body)).not.toContain('tag=secret');
  });

  it('returns structured diagnostics for upstream HTTP failures', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('blocked', { status: 503 }))
      .mockResolvedValueOnce(new Response('blocked', { status: 502 }))
      .mockResolvedValueOnce(new Response('blocked', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(jsonRequest({ url: 'https://www.amazon.co.jp/dp/B000000000' }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toMatchObject({
      error: '商品ページを取得できませんでした (503, upstream 5xx)',
      code: 'UPSTREAM_HTTP_ERROR',
      category: 'upstream_http',
      reason: expect.stringContaining('连续返回 5xx'),
      diagnostics: {
        source: 'amazon',
        finalUrl: 'https://www.amazon.co.jp/dp/B000000000',
        status: 503,
        attemptCount: 3,
        upstreamStatuses: [503, 502, 503],
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('recovers Amazon preview fetches when an upstream 5xx succeeds on retry', async () => {
    const amazonHtml = `
      <html>
        <head>
          <meta property="og:title" content="Amazon retry success">
          <meta property="og:image" content="https://m.media-amazon.com/images/I/retry._AC_SL1500_.jpg">
        </head>
      </html>
    `;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('temporarily unavailable', { status: 503 }))
      .mockResolvedValueOnce(htmlResponse(amazonHtml));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(jsonRequest({ url: 'https://www.amazon.co.jp/dp/B000000000' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preview.title).toBe('Amazon retry success');
    expect(body.preview.images).toEqual(['https://m.media-amazon.com/images/I/retry.jpg']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({
      'sec-fetch-site': 'same-origin',
    });
  });

  it('returns structured diagnostics for network failures', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed with private details'));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(jsonRequest({ url: 'https://www.amazon.co.jp/dp/B000000000?tag=secret' }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toMatchObject({
      code: 'NETWORK_ERROR',
      category: 'network',
      reason: expect.stringContaining('网络错误'),
      diagnostics: {
        source: 'amazon',
        finalUrl: 'https://www.amazon.co.jp/dp/B000000000',
        attemptCount: 3,
      },
    });
    expect(JSON.stringify(body)).not.toContain('private details');
    expect(JSON.stringify(body)).not.toContain('tag=secret');
  });

  it('returns structured diagnostics for non-HTML responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(jsonRequest({ url: 'https://www.amazon.co.jp/dp/B000000000' }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toMatchObject({
      code: 'NON_HTML',
      category: 'content_type',
      diagnostics: {
        contentType: 'application/json; charset=utf-8',
      },
    });
  });

  it('returns structured diagnostics for empty HTML responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(htmlResponse('   '));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(jsonRequest({ url: 'https://www.amazon.co.jp/dp/B000000000' }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toMatchObject({
      code: 'EMPTY_HTML',
      category: 'empty_html',
      diagnostics: {
        htmlBytes: 3,
      },
    });
  });

  it('returns structured diagnostics for oversized HTML responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(htmlResponse('x'.repeat(6_000_001)));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(jsonRequest({ url: 'https://www.amazon.co.jp/dp/B000000000' }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toMatchObject({
      code: 'HTML_TOO_LARGE',
      category: 'html_size',
      diagnostics: {
        htmlBytes: 6_000_001,
      },
    });
  });

  it('returns structured diagnostics for invalid redirects', async () => {
    const fetchMock = vi.fn().mockResolvedValue(redirectResponse('https://example.com/not-allowed'));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(jsonRequest({ url: 'https://amzn.asia/d/example' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: 'REDIRECT_ERROR',
      category: 'redirect',
      diagnostics: {
        source: 'amazon',
        finalUrl: 'https://example.com/not-allowed',
        status: 302,
      },
    });
  });
});
