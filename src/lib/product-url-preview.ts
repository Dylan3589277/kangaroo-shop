export type ProductUrlSource = 'amazon' | 'rakuten';

export type ProductUrlPreview = {
  source: ProductUrlSource;
  sourceUrl: string;
  title?: string;
  titleJa?: string;
  brand?: string;
  price?: number;
  originalPrice?: number;
  images: string[];
  description?: string;
};

type JsonValue =
  | null
  | string
  | number
  | boolean
  | JsonValue[]
  | { [key: string]: JsonValue };

const AMAZON_HOSTS = new Set(['amazon.co.jp', 'www.amazon.co.jp', 'amzn.asia']);
const RAKUTEN_SHORT_HOSTS = new Set(['a.r10.to', 'r10.to', 'hb.afl.rakuten.co.jp']);

export function detectProductUrlSource(rawUrl: string): ProductUrlSource | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') return null;

  const hostname = parsed.hostname.toLowerCase();
  if (AMAZON_HOSTS.has(hostname)) return 'amazon';
  if (
    hostname === 'rakuten.co.jp' ||
    hostname.endsWith('.rakuten.co.jp') ||
    RAKUTEN_SHORT_HOSTS.has(hostname)
  ) {
    return 'rakuten';
  }
  return null;
}

export function assertAllowedProductUrl(rawUrl: string): { source: ProductUrlSource; normalizedUrl: string } {
  const source = detectProductUrlSource(rawUrl);
  if (!source) {
    throw new Error('Only Japanese Amazon and Japanese Rakuten product URLs are supported');
  }

  const parsed = new URL(rawUrl);
  parsed.hash = '';
  return { source, normalizedUrl: parsed.toString() };
}

export function resolveKnownProductUrlTarget(rawUrl: string): string {
  const { source, normalizedUrl } = assertAllowedProductUrl(rawUrl);
  const parsed = new URL(normalizedUrl);
  const hostname = parsed.hostname.toLowerCase();

  if (source === 'rakuten' && RAKUTEN_SHORT_HOSTS.has(hostname)) {
    const pcTarget = parsed.searchParams.get('pc');
    if (pcTarget) {
      return assertAllowedProductUrl(pcTarget).normalizedUrl;
    }
  }

  return normalizedUrl;
}

export function parseProductPreviewHtml(html: string, rawUrl: string): ProductUrlPreview {
  const { source, normalizedUrl } = assertAllowedProductUrl(rawUrl);
  const meta = extractMetaTags(html);
  const jsonLdProducts = extractJsonLdProducts(html);

  const jsonLdTitle = firstString(jsonLdProducts.map(product => stringField(product, 'name')));
  const jsonLdBrand = firstString(jsonLdProducts.map(product => brandFromJsonLd(product)));
  const jsonLdDescription = firstString(jsonLdProducts.map(product => stringField(product, 'description')));
  const jsonLdPrice = firstNumber(jsonLdProducts.map(product => priceFromJsonLd(product)));
  const jsonLdImages = jsonLdProducts.flatMap(product => imagesFromJsonLd(product));

  const title =
    cleanText(jsonLdTitle)
    || meta['og:title']
    || meta['twitter:title']
    || extractById(html, 'productTitle')
    || extractByClass(html, 'item_name')
    || extractTitleTag(html);

  const brand =
    cleanBrand(jsonLdBrand)
    || cleanBrand(meta.brand)
    || cleanBrand(extractById(html, 'bylineInfo'))
    || cleanBrand(extractByClass(html, 'brand'));

  const description =
    cleanDescription(jsonLdDescription)
    || cleanDescription(meta['og:description'])
    || cleanDescription(meta.description)
    || cleanDescription(extractById(html, 'productDescription'))
    || cleanDescription(extractFeatureBullets(html));

  const price =
    jsonLdPrice
    ?? parseYenPrice(meta['product:price:amount'])
    ?? parseYenPrice(extractById(html, 'priceblock_ourprice'))
    ?? parseYenPrice(extractById(html, 'priceblock_dealprice'))
    ?? parseYenPrice(extractByClass(html, 'a-price-whole'))
    ?? parseYenPrice(extractByClass(html, 'price2'))
    ?? parseYenPrice(extractByClass(html, 'price'));

  const originalPrice =
    parseYenPrice(extractByClass(html, 'basisPrice'))
    ?? parseYenPrice(extractByClass(html, 'priceBlockStrikePriceString'))
    ?? parseYenPrice(extractByClass(html, 'a-text-price'));

  const images = uniqueUrls([
    meta['og:image'],
    meta['twitter:image'],
    ...jsonLdImages,
    ...extractAmazonImageUrls(html),
    ...extractRakutenImageUrls(html),
  ]);

  return {
    source,
    sourceUrl: normalizedUrl,
    ...(title ? { title, titleJa: title } : {}),
    ...(brand ? { brand } : {}),
    ...(price ? { price } : {}),
    ...(originalPrice && originalPrice !== price ? { originalPrice } : {}),
    images,
    ...(description ? { description } : {}),
  };
}

export function hasUsefulProductPreview(preview: ProductUrlPreview): boolean {
  if (isMarketplaceErrorTitle(preview.title)) return false;
  return Boolean(preview.title || preview.brand || preview.price || preview.images.length || preview.description);
}

function isMarketplaceErrorTitle(title: string | undefined): boolean {
  if (!title) return false;
  const normalized = title.trim().toLowerCase();
  return [
    'ページが見つかりません',
    'page not found',
    '404 not found',
  ].some(pattern => normalized.includes(pattern));
}

function extractMetaTags(html: string): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const match of Array.from(html.matchAll(/<meta\b[^>]*>/gi))) {
    const attrs = extractAttributes(match[0]);
    const key = (attrs.property || attrs.name || attrs.itemprop || '').toLowerCase();
    const content = attrs.content;
    const cleaned = cleanText(content);
    if (key && cleaned && !tags[key]) tags[key] = cleaned;
  }
  return tags;
}

function extractAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of Array.from(tag.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g))) {
    attrs[match[1].toLowerCase()] = decodeHtmlEntities(match[3] ?? match[4] ?? match[5] ?? '');
  }
  return attrs;
}

function extractJsonLdProducts(html: string): Record<string, JsonValue>[] {
  const products: Record<string, JsonValue>[] = [];
  for (const match of Array.from(html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))) {
    const text = decodeHtmlEntities(match[1]).trim();
    if (!text) continue;

    try {
      collectProductNodes(JSON.parse(text) as JsonValue, products);
    } catch {
      // Invalid JSON-LD is common on marketplace pages; ignore and keep parsing HTML.
    }
  }
  return products;
}

function collectProductNodes(value: JsonValue, products: Record<string, JsonValue>[]): void {
  if (Array.isArray(value)) {
    value.forEach(item => collectProductNodes(item, products));
    return;
  }
  if (!isRecord(value)) return;

  const type = value['@type'];
  const typeValues = Array.isArray(type) ? type : [type];
  if (typeValues.some(item => typeof item === 'string' && item.toLowerCase() === 'product')) {
    products.push(value);
  }

  const graph = value['@graph'];
  if (graph) collectProductNodes(graph, products);
}

function stringField(record: Record<string, JsonValue>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? cleanText(value) : undefined;
}

function brandFromJsonLd(record: Record<string, JsonValue>): string | undefined {
  const value = record.brand;
  if (typeof value === 'string') return value;
  if (isRecord(value) && typeof value.name === 'string') return value.name;
  return undefined;
}

function priceFromJsonLd(record: Record<string, JsonValue>): number | undefined {
  const offers = record.offers;
  const offerList = Array.isArray(offers) ? offers : [offers];
  for (const offer of offerList) {
    if (!isRecord(offer)) continue;
    const price = parseYenPrice(offer.price);
    if (price) return price;
    const lowPrice = parseYenPrice(offer.lowPrice);
    if (lowPrice) return lowPrice;
  }
  return undefined;
}

function imagesFromJsonLd(record: Record<string, JsonValue>): string[] {
  const image = record.image;
  if (typeof image === 'string') return [image];
  if (Array.isArray(image)) return image.filter((item): item is string => typeof item === 'string');
  if (isRecord(image) && typeof image.url === 'string') return [image.url];
  return [];
}

function isRecord(value: JsonValue | undefined): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractById(html: string, id: string): string | undefined {
  const escaped = escapeRegExp(id);
  const match = html.match(new RegExp(`<[^>]+id=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i'));
  return match ? cleanText(stripTags(match[1])) : undefined;
}

function extractByClass(html: string, className: string): string | undefined {
  const escaped = escapeRegExp(className);
  const match = html.match(new RegExp(`<[^>]+class=["'][^"']*\\b${escaped}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i'));
  return match ? cleanText(stripTags(match[1])) : undefined;
}

function extractTitleTag(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? cleanText(stripTags(match[1])) : undefined;
}

function extractFeatureBullets(html: string): string | undefined {
  const match = html.match(/<div[^>]+id=["']feature-bullets["'][^>]*>([\s\S]*?)<\/div>/i);
  if (!match) return undefined;
  const bullets = Array.from(match[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi))
    .map(item => cleanText(stripTags(item[1])))
    .filter(Boolean);
  return bullets.slice(0, 6).join('\n');
}

function extractAmazonImageUrls(html: string): string[] {
  const urls: string[] = [];
  for (const match of Array.from(html.matchAll(/["'](https:\/\/m\.media-amazon\.com\/images\/I\/[^"']+)["']/g))) {
    urls.push(normalizeAmazonImageUrl(decodeEscapedUrl(match[1])));
  }

  for (const match of Array.from(html.matchAll(/data-old-hires=["']([^"']+)["']/gi))) {
    urls.push(decodeEscapedUrl(match[1]));
  }
  return urls;
}

function extractRakutenImageUrls(html: string): string[] {
  const urls: string[] = [];
  for (const match of Array.from(html.matchAll(/https?:\\?\/\\?\/image\.rakuten\.co\.jp\\?\/[^"'<>\s]+/gi))) {
    urls.push(decodeEscapedUrl(match[0]));
  }
  for (const match of Array.from(html.matchAll(/https?:\\?\/\\?\/thumbnail\.image\.rakuten\.co\.jp\\?\/[^"'<>\s]+/gi))) {
    urls.push(decodeEscapedUrl(match[0]));
  }
  return urls;
}

function normalizeAmazonImageUrl(url: string): string {
  return url.replace(/\._[A-Z0-9_,]+_\.(jpg|jpeg|png|webp)$/i, '.$1');
}

export function parseYenPrice(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const normalized = String(value)
    .replace(/[０-９]/g, digit => String.fromCharCode(digit.charCodeAt(0) - 0xfee0))
    .replace(/[,，\s円￥¥]/g, '')
    .replace(/[^\d.]/g, '');
  if (!normalized) return undefined;

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  return Math.round(amount);
}

function uniqueUrls(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const value of values) {
    const cleaned = cleanUrl(value);
    if (!cleaned || !isLikelyProductImageUrl(cleaned) || seen.has(cleaned)) continue;
    seen.add(cleaned);
    urls.push(cleaned);
  }
  return urls.slice(0, 12);
}

function cleanUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const decoded = decodeEscapedUrl(decodeHtmlEntities(value.trim()));
  try {
    const url = new URL(decoded);
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    const normalized = url.toString();
    return normalized.includes('m.media-amazon.com/images/I/')
      ? normalizeAmazonImageUrl(normalized)
      : normalized;
  } catch {
    return undefined;
  }
}

function isLikelyProductImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();

    if (/\.(?:avif|gif|jpe?g|png|webp)$/.test(pathname)) return true;
    if (/\.(?:css|js|json|map|mjs|svg|html?)$/.test(pathname)) return false;

    return (
      hostname === 'm.media-amazon.com' && pathname.includes('/images/')
      || hostname === 'image.rakuten.co.jp'
      || hostname === 'thumbnail.image.rakuten.co.jp'
    );
  } catch {
    return false;
  }
}

export function decodeProductHtml(bytes: Uint8Array, contentType: string): string {
  const encoding = htmlEncodingFromContentType(contentType);

  try {
    return new TextDecoder(encoding).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

export function htmlEncodingFromContentType(contentType: string): string {
  const match = contentType.match(/charset\s*=\s*"?([^";\s]+)"?/i);
  const charset = match?.[1]?.trim().toLowerCase().replace(/_/g, '-');

  switch (charset) {
    case 'euc-jp':
    case 'eucjp':
    case 'x-euc-jp':
      return 'euc-jp';
    case 'shift-jis':
    case 'shift_jis':
    case 'shiftjis':
    case 'sjis':
    case 'windows-31j':
    case 'ms932':
    case 'x-sjis':
      return 'shift_jis';
    case 'utf8':
    case 'utf-8':
    default:
      return 'utf-8';
  }
}

function firstString(values: Array<string | undefined>): string | undefined {
  return values.find(value => Boolean(value));
}

function firstNumber(values: Array<number | undefined>): number | undefined {
  return values.find(value => typeof value === 'number');
}

function cleanBrand(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = cleanText(value);
  if (!cleaned) return undefined;
  return cleaned
    .replace(/^Brand\s*[:：]\s*/i, '')
    .replace(/^ブランド\s*[:：]\s*/i, '')
    .replace(/^Visit the\s+(.+?)\s+Store$/i, '$1')
    .replace(/^(.+?)のストア$/, '$1')
    .trim() || undefined;
}

function cleanDescription(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = cleanText(value);
  if (!cleaned) return undefined;
  return cleaned.length > 1000 ? `${cleaned.slice(0, 1000).trim()}...` : cleaned;
}

function cleanText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return decodeHtmlEntities(value)
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.:;!?])/g, '$1')
    .trim() || undefined;
}

function stripTags(value: string): string {
  return value.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: '&',
    quot: '"',
    apos: "'",
    lt: '<',
    gt: '>',
    nbsp: ' ',
    yen: '¥',
  };

  return value
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, entity: string) => {
      const lower = entity.toLowerCase();
      if (lower.startsWith('#x')) return String.fromCodePoint(parseInt(lower.slice(2), 16));
      if (lower.startsWith('#')) return String.fromCodePoint(parseInt(lower.slice(1), 10));
      return named[lower] ?? `&${entity};`;
    });
}

function decodeEscapedUrl(value: string): string {
  return value
    .replace(/\\\//g, '/')
    .replace(/\\u002F/gi, '/')
    .replace(/&amp;/g, '&');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
