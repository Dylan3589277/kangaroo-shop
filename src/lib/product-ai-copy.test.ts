import { describe, expect, it, vi } from 'vitest';
import { generateProductAiCopy, parseProductAiCopyJson } from './product-ai-copy';
import type { ProductUrlPreview } from './product-url-preview';

const preview: ProductUrlPreview = {
  source: 'amazon',
  sourceUrl: 'https://www.amazon.co.jp/dp/B000000000',
  title: 'テスト商品',
  titleJa: 'テスト商品',
  brand: 'テストブランド',
  price: 1980,
  images: [],
  description: '軽くて使いやすい商品です。',
};

describe('product AI copy helpers', () => {
  it('parses strict JSON copy fields', () => {
    expect(parseProductAiCopyJson(JSON.stringify({
      titleEn: 'Test Product',
      title: '测试商品',
      description: '轻便好用\n适合日常使用',
    }))).toEqual({
      titleEn: 'Test Product',
      title: '测试商品',
      description: '轻便好用\n适合日常使用',
    });
  });

  it('falls back to extracting a JSON object from extra model text', () => {
    expect(parseProductAiCopyJson('Here is the JSON: {"titleEn":"Cup","title":"杯子","description":"日本精选"}')).toEqual({
      titleEn: 'Cup',
      title: '杯子',
      description: '日本精选',
    });
  });

  it('returns null when no usable JSON fields exist', () => {
    expect(parseProductAiCopyJson('not json')).toBeNull();
    expect(parseProductAiCopyJson('{"other":"value"}')).toBeNull();
  });

  it('skips generation without OPENAI_API_KEY and does not call fetch', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    await expect(generateProductAiCopy(preview, { apiKey: '', fetchImpl })).resolves.toEqual({
      status: 'skipped',
      message: 'OPENAI_API_KEY is not configured',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
