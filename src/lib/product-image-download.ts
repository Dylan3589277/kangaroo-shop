import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

export const PRODUCT_IMAGE_STORAGE = 'local-public-dev' as const;

export type ProductImageStorage = typeof PRODUCT_IMAGE_STORAGE;

export type LocalizedProductImage = {
  originalUrl: string;
  url: string;
  storage: ProductImageStorage;
  reused: boolean;
};

type DownloadOptions = {
  fetchImpl?: typeof fetch;
  publicDir?: string;
  timeoutMs?: number;
  maxBytes?: number;
};

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_BYTES = 5_000_000;
const UPLOAD_PATH = '/uploads/products';
const AMAZON_IMAGE_HOSTS = new Set(['m.media-amazon.com']);
const RAKUTEN_IMAGE_HOSTS = new Set([
  'image.rakuten.co.jp',
  'thumbnail.image.rakuten.co.jp',
  'shop.r10s.jp',
  'r.r10s.jp',
]);

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function assertAllowedProductImageUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid image URL');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS product images are allowed');
  }

  const hostname = parsed.hostname.toLowerCase();
  const isAllowed =
    AMAZON_IMAGE_HOSTS.has(hostname)
    || RAKUTEN_IMAGE_HOSTS.has(hostname);

  if (!isAllowed) {
    throw new Error('Product image host is not allowed');
  }

  return parsed;
}

export function buildSafeProductImageFilename(rawUrl: string, contentType: string): string {
  const parsed = assertAllowedProductImageUrl(rawUrl);
  const normalizedContentType = contentType.split(';')[0].trim().toLowerCase();
  if (!normalizedContentType.startsWith('image/')) {
    throw new Error('Unsupported image content type');
  }

  const extension = IMAGE_EXTENSIONS[normalizedContentType] ?? extensionFromPath(parsed.pathname);
  if (!extension) throw new Error('Unsupported image content type');

  const sourcePrefix = parsed.hostname.includes('amazon') ? 'amazon' : 'rakuten';
  const hash = createHash('sha256').update(parsed.toString()).digest('hex').slice(0, 24);
  return `${sourcePrefix}-${hash}.${extension}`;
}

export async function localizeProductImages(
  imageUrls: string[],
  options: DownloadOptions = {}
): Promise<LocalizedProductImage[]> {
  const uniqueUrls = uniqueAllowedImageUrls(imageUrls);
  const localized: LocalizedProductImage[] = [];

  for (const imageUrl of uniqueUrls) {
    localized.push(await downloadProductImage(imageUrl, options));
  }

  return localized;
}

export function uniqueAllowedImageUrls(imageUrls: string[]): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const imageUrl of imageUrls) {
    let parsed: URL;
    try {
      parsed = assertAllowedProductImageUrl(imageUrl);
    } catch {
      continue;
    }

    const normalized = parsed.toString();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    urls.push(normalized);
  }

  return urls;
}

async function downloadProductImage(
  imageUrl: string,
  {
    fetchImpl = fetch,
    publicDir = path.join(process.cwd(), 'public'),
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = DEFAULT_MAX_BYTES,
  }: DownloadOptions
): Promise<LocalizedProductImage> {
  assertAllowedProductImageUrl(imageUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(imageUrl, {
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
      headers: {
        accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif,image/*;q=0.8',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Product image download timed out');
    }
    throw new Error('Product image download failed');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Product image download failed (${response.status})`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error('Downloaded product image is not an image');
  }

  const bytes = await readLimitedBytes(response, maxBytes);
  const filename = buildSafeProductImageFilename(imageUrl, contentType);
  const uploadDir = path.join(publicDir, 'uploads', 'products');
  const filePath = path.join(uploadDir, filename);

  // Vercel serverless filesystems are ephemeral; this local public storage is for dev/first-pass admin workflow only.
  await mkdir(uploadDir, { recursive: true });
  const reused = existsSync(filePath);
  if (!reused) {
    await writeFile(filePath, bytes);
  }

  return {
    originalUrl: imageUrl,
    url: `${UPLOAD_PATH}/${filename}`,
    storage: PRODUCT_IMAGE_STORAGE,
    reused,
  };
}

async function readLimitedBytes(response: Response, maxBytes: number): Promise<Buffer> {
  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) throw new Error('Product image is too large');
    return buffer;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) throw new Error('Product image is too large');
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

function extensionFromPath(pathname: string): string | undefined {
  const match = pathname.toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  const extension = match?.[1];
  return extension && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)
    ? extension.replace('jpeg', 'jpg')
    : undefined;
}
