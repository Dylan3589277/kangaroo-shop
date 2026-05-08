import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { serverError } from '@/lib/api-error';
import {
  assertAllowedProductUrl,
  decodeProductHtml,
  hasUsefulProductPreview,
  parseProductPreviewHtml,
  resolveKnownProductUrlTarget,
} from '@/lib/product-url-preview';
import { generateProductAiCopy } from '@/lib/product-ai-copy';
import {
  PRODUCT_IMAGE_STORAGE,
  localizeProductImages,
  type LocalizedProductImage,
} from '@/lib/product-image-download';
import { parseRequestJsonObject } from '@/lib/request-json';

export const runtime = 'nodejs';

const MAX_HTML_BYTES = 6_000_000;
const DEFAULT_FETCH_TIMEOUT_MS = 15_000;
const RAKUTEN_FETCH_TIMEOUT_MS = 20_000;
const DEFAULT_FETCH_ATTEMPTS = 3;
const RAKUTEN_FETCH_ATTEMPTS = 2;
const MAX_REDIRECTS = 3;

type ProductPreviewErrorCategory =
  | 'unsupported_url'
  | 'upstream_http'
  | 'timeout'
  | 'network'
  | 'content_type'
  | 'empty_html'
  | 'html_size'
  | 'redirect'
  | 'parse_empty'
  | 'server';

type ProductPreviewErrorCode =
  | 'UNSUPPORTED_URL'
  | 'UPSTREAM_HTTP_ERROR'
  | 'FETCH_TIMEOUT'
  | 'NETWORK_ERROR'
  | 'NON_HTML'
  | 'EMPTY_HTML'
  | 'HTML_TOO_LARGE'
  | 'REDIRECT_ERROR'
  | 'PARSE_EMPTY'
  | 'UNKNOWN_SERVER_ERROR';

type EmptyPreviewClassification =
  | 'anti_bot_or_captcha'
  | 'platform_error_or_missing_product'
  | 'decode_failure'
  | 'structure_changed_or_unmatched';

type ProductPreviewDiagnostics = {
  source?: string;
  finalUrl?: string;
  status?: number;
  contentType?: string;
  htmlBytes?: number;
  htmlTitle?: string;
  classification?: EmptyPreviewClassification;
  redirectCount?: number;
  attemptCount?: number;
  upstreamStatuses?: number[];
};

type ProductPreviewErrorBody = {
  error: string;
  code: ProductPreviewErrorCode;
  category: ProductPreviewErrorCategory;
  reason: string;
  diagnostics?: ProductPreviewDiagnostics;
};

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
      normalizedUrl = resolveKnownProductUrlTarget(assertAllowedProductUrl(url.trim()).normalizedUrl);
    } catch {
      return NextResponse.json(
        previewErrorBody({
          error: '只支持日本 Amazon 与日本 Rakuten 的商品链接',
          code: 'UNSUPPORTED_URL',
          category: 'unsupported_url',
          reason: 'URL 不在允许的平台或协议范围内，只接受日本 Amazon / Rakuten 的 HTTPS 商品链接。',
        }),
        { status: 400 }
      );
    }

    const { html, finalUrl, source, contentType, htmlBytes } = await fetchAllowedHtml(normalizedUrl);
    const preview = parseProductPreviewHtml(html, finalUrl);
    const emptyPreviewClassification = classifyEmptyPreviewHtml(html);

    if (!hasUsefulProductPreview(preview) || isSuspiciousTitleOnlyPreview(preview, emptyPreviewClassification.classification)) {
      const diagnostics = sanitizeDiagnostics({
        source,
        finalUrl,
        contentType,
        htmlBytes,
        htmlTitle: emptyPreviewClassification.htmlTitle,
        classification: emptyPreviewClassification.classification,
      });
      console.warn('product-url-preview unusable preview', {
        ...diagnostics,
        previewSummary: summarizePreviewKeys(preview),
      });
      return NextResponse.json(
        previewErrorBody({
          error: '未能从该页面读取到商品信息',
          code: 'PARSE_EMPTY',
          category: 'parse_empty',
          reason: emptyPreviewClassification.reason,
          diagnostics,
        }),
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
      return NextResponse.json(err.toBody(), { status: err.status });
    }

    return serverError(err, previewErrorBody({
      error: '商品ページの取得中にサーバーエラーが発生しました',
      code: 'UNKNOWN_SERVER_ERROR',
      category: 'server',
      reason: '商品 URL 预览接口出现未分类服务器错误，请查看服务端日志中的异常堆栈。',
    }));
  }
}

class ProductPreviewFetchError extends Error {
  readonly code: ProductPreviewErrorCode;
  readonly category: ProductPreviewErrorCategory;
  readonly reason: string;
  readonly diagnostics?: ProductPreviewDiagnostics;

  constructor(input: {
    message: string;
    status: number;
    code: ProductPreviewErrorCode;
    category: ProductPreviewErrorCategory;
    reason: string;
    diagnostics?: ProductPreviewDiagnostics;
  }) {
    super(input.message);
    this.status = input.status;
    this.code = input.code;
    this.category = input.category;
    this.reason = input.reason;
    this.diagnostics = sanitizeDiagnostics(input.diagnostics);
  }

  readonly status: number;

  toBody(): ProductPreviewErrorBody {
    return previewErrorBody({
      error: this.message,
      code: this.code,
      category: this.category,
      reason: this.reason,
      diagnostics: this.diagnostics,
    });
  }
}

function previewErrorBody(input: ProductPreviewErrorBody): ProductPreviewErrorBody {
  return {
    error: input.error,
    code: input.code,
    category: input.category,
    reason: input.reason,
    ...(input.diagnostics ? { diagnostics: sanitizeDiagnostics(input.diagnostics) } : {}),
  };
}

function sanitizeDiagnostics(diagnostics: ProductPreviewDiagnostics | undefined): ProductPreviewDiagnostics | undefined {
  if (!diagnostics) return undefined;
  return {
    ...(diagnostics.source ? { source: diagnostics.source } : {}),
    ...(diagnostics.finalUrl ? { finalUrl: sanitizeProductUrlForDiagnostics(diagnostics.finalUrl) } : {}),
    ...(typeof diagnostics.status === 'number' ? { status: diagnostics.status } : {}),
    ...(diagnostics.contentType ? { contentType: truncate(diagnostics.contentType, 120) } : {}),
    ...(typeof diagnostics.htmlBytes === 'number' ? { htmlBytes: diagnostics.htmlBytes } : {}),
    ...(diagnostics.htmlTitle ? { htmlTitle: truncate(diagnostics.htmlTitle, 160) } : {}),
    ...(diagnostics.classification ? { classification: diagnostics.classification } : {}),
    ...(typeof diagnostics.redirectCount === 'number' ? { redirectCount: diagnostics.redirectCount } : {}),
    ...(typeof diagnostics.attemptCount === 'number' ? { attemptCount: diagnostics.attemptCount } : {}),
    ...(diagnostics.upstreamStatuses?.length ? { upstreamStatuses: diagnostics.upstreamStatuses.slice(0, 5) } : {}),
  };
}

function sanitizeProductUrlForDiagnostics(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return 'invalid-url';
  }
}

function summarizePreviewKeys(preview: ReturnType<typeof parseProductPreviewHtml>) {
  return {
    source: preview.source,
    hasTitle: Boolean(preview.title),
    hasTitleJa: Boolean(preview.titleJa),
    hasBrand: Boolean(preview.brand),
    hasPrice: typeof preview.price === 'number',
    hasOriginalPrice: typeof preview.originalPrice === 'number',
    imageCount: preview.images.length,
    hasDescription: Boolean(preview.description),
  };
}

function isSuspiciousTitleOnlyPreview(
  preview: ReturnType<typeof parseProductPreviewHtml>,
  classification: EmptyPreviewClassification
): boolean {
  if (!preview.title) return false;
  if (preview.brand || typeof preview.price === 'number' || preview.images.length || preview.description) return false;
  return classification === 'anti_bot_or_captcha' || classification === 'platform_error_or_missing_product';
}

async function fetchAllowedHtml(initialUrl: string): Promise<{
  html: string;
  finalUrl: string;
  source: string;
  contentType: string;
  htmlBytes: number;
}> {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const { source } = assertAllowedProductUrl(currentUrl);
    const timeoutMs = source === 'rakuten' ? RAKUTEN_FETCH_TIMEOUT_MS : DEFAULT_FETCH_TIMEOUT_MS;
    const maxAttempts = source === 'rakuten' ? RAKUTEN_FETCH_ATTEMPTS : DEFAULT_FETCH_ATTEMPTS;

    const response = await fetchWithRetry(currentUrl, source, timeoutMs, maxAttempts);
    const attempts = readFetchAttempts(response);

    if (isRedirect(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        throw new ProductPreviewFetchError({
          message: '商品ページのリダイレクト先を確認できませんでした',
          status: 502,
          code: 'REDIRECT_ERROR',
          category: 'redirect',
          reason: '上游返回重定向状态，但没有提供 Location 头。',
          diagnostics: { source, finalUrl: currentUrl, status: response.status, redirectCount, ...attempts },
        });
      }

      try {
        currentUrl = new URL(location, currentUrl).toString();
      } catch {
        throw new ProductPreviewFetchError({
          message: '商品ページのリダイレクト先URLが不正です',
          status: 502,
          code: 'REDIRECT_ERROR',
          category: 'redirect',
          reason: '上游返回的重定向地址不是有效 URL。',
          diagnostics: { source, finalUrl: currentUrl, status: response.status, redirectCount, ...attempts },
        });
      }
      try {
        currentUrl = resolveKnownProductUrlTarget(assertAllowedProductUrl(currentUrl).normalizedUrl);
      } catch {
        throw new ProductPreviewFetchError({
          message: '許可されていないドメインへのリダイレクトをブロックしました',
          status: 400,
          code: 'REDIRECT_ERROR',
          category: 'redirect',
          reason: '商品页重定向到了非允许域名，已阻止继续访问。',
          diagnostics: { source, finalUrl: currentUrl, status: response.status, redirectCount, ...attempts },
        });
      }
      continue;
    }

    if (!response.ok) {
      const isUpstream5xx = response.status >= 500;
      throw new ProductPreviewFetchError({
        message: isUpstream5xx
          ? `商品ページを取得できませんでした (${response.status}, upstream 5xx)`
          : `商品ページを取得できませんでした (${response.status})`,
        status: response.status >= 400 && response.status < 500 ? 422 : 502,
        code: 'UPSTREAM_HTTP_ERROR',
        category: 'upstream_http',
        reason: response.status >= 400 && response.status < 500
          ? '上游商品页返回 4xx，可能是商品不存在、链接失效或访问被拒绝。'
          : '上游商品页连续返回 5xx；接口已按临时异常重试，仍无法恢复，可能是平台服务暂时不可用或拒绝代理访问。',
        diagnostics: { source, finalUrl: currentUrl, status: response.status, redirectCount, ...attempts },
      });
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType && !contentType.toLowerCase().includes('text/html')) {
      throw new ProductPreviewFetchError({
        message: '商品ページがHTMLではありません',
        status: 422,
        code: 'NON_HTML',
        category: 'content_type',
        reason: '上游返回内容不是 HTML，无法按商品页面解析。',
        diagnostics: { source, finalUrl: currentUrl, status: response.status, contentType, redirectCount, ...attempts },
      });
    }

    const { html, bytes } = await readLimitedText(response, MAX_HTML_BYTES, contentType, {
      source,
      finalUrl: currentUrl,
      status: response.status,
      contentType,
      redirectCount,
      ...attempts,
    });
    if (!html.trim()) {
      throw new ProductPreviewFetchError({
        message: '商品ページのHTMLが空です',
        status: 422,
        code: 'EMPTY_HTML',
        category: 'empty_html',
        reason: '上游返回了空 HTML，无法解析商品信息。',
        diagnostics: { source, finalUrl: currentUrl, status: response.status, contentType, htmlBytes: bytes, redirectCount, ...attempts },
      });
    }
    return { html, finalUrl: currentUrl, source, contentType, htmlBytes: bytes };
  }

  throw new ProductPreviewFetchError({
    message: 'リダイレクト回数が多すぎます',
    status: 400,
    code: 'REDIRECT_ERROR',
    category: 'redirect',
    reason: '商品页重定向次数超过允许上限。',
    diagnostics: { finalUrl: currentUrl, redirectCount: MAX_REDIRECTS + 1 },
  });
}

async function fetchWithRetry(
  url: string,
  source: string,
  timeoutMs: number,
  maxAttempts: number
): Promise<Response> {
  let lastError: ProductPreviewFetchError | undefined;
  const upstreamStatuses: number[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        cache: 'no-store',
        redirect: 'manual',
        signal: controller.signal,
        headers: productPageFetchHeaders(source, attempt),
      });
      upstreamStatuses.push(response.status);
      attachFetchAttempts(response, attempt, upstreamStatuses);

      if (attempt < maxAttempts && isRetryableUpstreamStatus(response.status)) {
        await response.body?.cancel();
        await waitBeforeRetry(attempt);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error && error.name === 'AbortError'
        ? new ProductPreviewFetchError({
          message: '商品ページの取得がタイムアウトしました。しばらくしてから再試行してください。',
          status: 504,
          code: 'FETCH_TIMEOUT',
          category: 'timeout',
          reason: '商品页请求超过等待时间，可能是上游响应慢或连接被平台拖住。',
          diagnostics: { source, finalUrl: url, attemptCount: attempt, upstreamStatuses },
        })
        : new ProductPreviewFetchError({
          message: '商品ページの取得に失敗しました。しばらくしてから再試行してください。',
          status: 502,
          code: 'NETWORK_ERROR',
          category: 'network',
          reason: '商品页请求发生网络错误，未能拿到上游 HTTP 响应。',
          diagnostics: { source, finalUrl: url, attemptCount: attempt, upstreamStatuses },
        });

      if (attempt < maxAttempts) {
        await waitBeforeRetry(attempt);
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new ProductPreviewFetchError({
    message: '商品ページの取得に失敗しました',
    status: 502,
    code: 'NETWORK_ERROR',
    category: 'network',
    reason: '商品页请求失败，未能拿到上游 HTTP 响应。',
    diagnostics: { source, finalUrl: url, attemptCount: maxAttempts, upstreamStatuses },
  });
}

function isRetryableUpstreamStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function productPageFetchHeaders(source: string, attempt: number): HeadersInit {
  const desktopHeaders = {
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'accept-language': 'ja-JP,ja;q=0.9,en-US;q=0.7,en;q=0.6',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  };

  if (source === 'amazon' && attempt > 1) {
    return {
      ...desktopHeaders,
      'user-agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      'sec-fetch-site': 'same-origin',
    };
  }

  return desktopHeaders;
}

const fetchAttemptMeta = new WeakMap<Response, Pick<ProductPreviewDiagnostics, 'attemptCount' | 'upstreamStatuses'>>();

function attachFetchAttempts(response: Response, attemptCount: number, upstreamStatuses: number[]): void {
  fetchAttemptMeta.set(response, { attemptCount, upstreamStatuses: [...upstreamStatuses] });
}

function readFetchAttempts(response: Response): Pick<ProductPreviewDiagnostics, 'attemptCount' | 'upstreamStatuses'> {
  return fetchAttemptMeta.get(response) ?? {};
}

function isRedirect(status: number): boolean {
  return [301, 302, 303, 307, 308].includes(status);
}

function waitBeforeRetry(attempt: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, attempt * 300));
}

async function readLimitedText(
  response: Response,
  maxBytes: number,
  contentType: string,
  diagnostics: ProductPreviewDiagnostics
): Promise<{ html: string; bytes: number }> {
  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      throw htmlTooLargeError(maxBytes, { ...diagnostics, htmlBytes: buffer.byteLength });
    }
    return { html: decodeProductHtml(buffer, contentType), bytes: buffer.byteLength };
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      throw htmlTooLargeError(maxBytes, { ...diagnostics, htmlBytes: total });
    }
    chunks.push(value);
  }

  return { html: decodeProductHtml(Buffer.concat(chunks), contentType), bytes: total };
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${Math.floor(bytes / 1_000_000)}MB`;
  if (bytes >= 1_000) return `${Math.floor(bytes / 1_000)}KB`;
  return `${bytes}B`;
}

function htmlTooLargeError(maxBytes: number, diagnostics: ProductPreviewDiagnostics): ProductPreviewFetchError {
  return new ProductPreviewFetchError({
    message: `商品ページのHTMLが大きすぎます (${formatBytes(maxBytes)}超)`,
    status: 422,
    code: 'HTML_TOO_LARGE',
    category: 'html_size',
    reason: '上游 HTML 超过预览接口允许的最大读取量，已停止下载以避免记录或处理整页内容。',
    diagnostics,
  });
}

function classifyEmptyPreviewHtml(html: string): {
  classification: EmptyPreviewClassification;
  reason: string;
  htmlTitle?: string;
} {
  const htmlTitle = extractHtmlTitleForDiagnostics(html);
  const metaDescription = extractMetaDescriptionForDiagnostics(html);
  const text = truncate(stripScriptsStyles(html).replace(/<[^>]+>/g, ' '), 20_000).toLowerCase();
  const titleAndMeta = `${htmlTitle ?? ''} ${metaDescription ?? ''}`.toLowerCase();
  const haystack = `${titleAndMeta} ${text}`;
  const replacementCount = (html.match(/\uFFFD/g) ?? []).length;

  if (
    replacementCount >= 20
    || haystack.includes('ã')
    || haystack.includes('�')
  ) {
    return {
      classification: 'decode_failure',
      reason: '页面文本疑似解码失败或乱码，解析器无法可靠识别商品字段。',
      htmlTitle,
    };
  }

  if (matchesAny(haystack, [
    'captcha',
    'robot check',
    'automated access',
    'enter the characters',
    '認証',
    'アクセス制限',
    'アクセスが集中',
    'セキュリティ',
    'bot',
    'ロボット',
    '申し訳ありません',
  ])) {
    return {
      classification: 'anti_bot_or_captcha',
      reason: '页面特征疑似反爬、验证码或访问限制，没有暴露可解析的商品字段。',
      htmlTitle,
    };
  }

  if (matchesAny(haystack, [
    '404',
    'page not found',
    'ページが見つかりません',
    '商品が見つかりません',
    '商品は見つかりません',
    '該当する商品はありません',
    '現在ご利用いただけません',
    'お探しの商品',
    'not found',
    'error',
    'エラー',
  ])) {
    return {
      classification: 'platform_error_or_missing_product',
      reason: '页面特征疑似平台错误页、商品不存在或商品链接已失效。',
      htmlTitle,
    };
  }

  return {
    classification: 'structure_changed_or_unmatched',
    reason: '页面是 HTML，但现有选择器没有匹配到标题、价格、图片或描述，可能是页面结构变更。',
    htmlTitle,
  };
}

function extractHtmlTitleForDiagnostics(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return cleanDiagnosticText(match?.[1]);
}

function extractMetaDescriptionForDiagnostics(html: string): string | undefined {
  const match = html.match(/<meta\b[^>]*(?:name|property)=["'](?:description|og:description)["'][^>]*>/i);
  const content = match?.[0].match(/\bcontent\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
  return cleanDiagnosticText(content?.[2] ?? content?.[3] ?? content?.[4]);
}

function cleanDiagnosticText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned ? truncate(cleaned, 160) : undefined;
}

function stripScriptsStyles(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
}

function matchesAny(value: string, needles: string[]): boolean {
  return needles.some(needle => value.includes(needle.toLowerCase()));
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;
}
