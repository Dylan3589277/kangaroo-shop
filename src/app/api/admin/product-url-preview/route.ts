import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { serverError } from '@/lib/api-error';
import {
  assertAllowedProductUrl,
  hasUsefulProductPreview,
  parseProductPreviewHtml,
} from '@/lib/product-url-preview';
import { generateProductAiCopy } from '@/lib/product-ai-copy';
import {
  PRODUCT_IMAGE_STORAGE,
  localizeProductImages,
  type LocalizedProductImage,
} from '@/lib/product-image-download';
import { parseRequestJsonObject } from '@/lib/request-json';

export const runtime = 'nodejs';

const MAX_HTML_BYTES = 2_000_000;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

export async function POST(req: NextRequest) {
  try {
    const { response } = await requireAdminSession();
    if (response) return response;

    const parsed = await parseRequestJsonObject(req);
    if (!parsed.success) return parsed.response;

    const url = parsed.data.url;
    if (typeof url !== 'string' || !url.trim()) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    let normalizedUrl: string;
    try {
      normalizedUrl = assertAllowedProductUrl(url.trim()).normalizedUrl;
    } catch {
      return NextResponse.json(
        { error: '只支持日本 Amazon 与日本 Rakuten 的商品链接' },
        { status: 400 }
      );
    }

    const html = await fetchAllowedHtml(normalizedUrl);
    const preview = parseProductPreviewHtml(html, normalizedUrl);

    if (!hasUsefulProductPreview(preview)) {
      return NextResponse.json(
        { error: '未能从该页面读取到商品信息。页面可能开启了反爬或不是商品详情页。' },
        { status: 422 }
      );
    }

    let imageDownloads: LocalizedProductImage[] = [];
    let imageDownloadError: string | undefined;

    if (parsed.data.localizeImages === true && preview.images.length) {
      try {
        imageDownloads = await localizeProductImages(preview.images);
        if (imageDownloads.length) {
          preview.images = imageDownloads.map(image => image.url);
        }
      } catch {
        imageDownloadError = '画像のローカル保存に失敗しました。外部URLのプレビューのみ表示します。';
      }
    }

    const ai = parsed.data.generateAi === true
      ? await generateProductAiCopy(preview)
      : { status: 'skipped' as const, message: 'AI generation was not requested' };

    return NextResponse.json({
      preview,
      ai,
      imageDownloads,
      imageStorage: {
        storage: PRODUCT_IMAGE_STORAGE,
        note: 'local-public-dev writes to public/uploads/products for development/first-pass admin use. Vercel production filesystems are ephemeral; replace with object storage before relying on persistence.',
        ...(imageDownloadError ? { error: imageDownloadError } : {}),
      },
    });
  } catch (err) {
    if (err instanceof ProductPreviewFetchError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    return serverError(err);
  }
}

class ProductPreviewFetchError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function fetchAllowedHtml(initialUrl: string): Promise<string> {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    assertAllowedProductUrl(currentUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(currentUrl, {
        cache: 'no-store',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'ja-JP,ja;q=0.9,en;q=0.6',
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProductPreviewFetchError('商品ページの取得がタイムアウトしました', 504);
      }
      throw new ProductPreviewFetchError('商品ページの取得に失敗しました', 502);
    } finally {
      clearTimeout(timeout);
    }

    if (isRedirect(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        throw new ProductPreviewFetchError('商品ページのリダイレクト先を確認できませんでした', 502);
      }

      currentUrl = new URL(location, currentUrl).toString();
      try {
        assertAllowedProductUrl(currentUrl);
      } catch {
        throw new ProductPreviewFetchError('許可されていないドメインへのリダイレクトをブロックしました', 400);
      }
      continue;
    }

    if (!response.ok) {
      throw new ProductPreviewFetchError(
        `商品ページを取得できませんでした (${response.status})`,
        response.status >= 400 && response.status < 500 ? 422 : 502
      );
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType && !contentType.toLowerCase().includes('text/html')) {
      throw new ProductPreviewFetchError('商品ページがHTMLではありません', 422);
    }

    const html = await readLimitedText(response, MAX_HTML_BYTES);
    if (!html.trim()) {
      throw new ProductPreviewFetchError('商品ページのHTMLが空です', 422);
    }
    return html;
  }

  throw new ProductPreviewFetchError('リダイレクト回数が多すぎます', 400);
}

function isRedirect(status: number): boolean {
  return [301, 302, 303, 307, 308].includes(status);
}

async function readLimitedText(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return response.text();

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      throw new ProductPreviewFetchError('商品ページのHTMLが大きすぎます', 422);
    }
    chunks.push(value);
  }

  return new TextDecoder().decode(Buffer.concat(chunks));
}
