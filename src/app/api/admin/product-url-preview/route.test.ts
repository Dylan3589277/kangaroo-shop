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

  it('rejects unsafe Rakuten pc targets before fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(jsonRequest({
      url: 'https://a.r10.to/hExample?pc=https%3A%2F%2F127.0.0.1%2Fadmin',
    }));

    expect(response.status).toBe(400);
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
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual([
      'https://amzn.asia/d/example',
      'https://www.amazon.co.jp/dp/B000000000',
    ]);
  });
});
