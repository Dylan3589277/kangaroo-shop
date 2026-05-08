import { describe, expect, it } from 'vitest';
import {
  PRODUCT_IMAGE_STORAGE,
  assertAllowedProductImageUrl,
  buildSafeProductImageFilename,
  uniqueAllowedImageUrls,
} from './product-image-download';

describe('product image download safety helpers', () => {
  it('allows only approved Amazon and Rakuten HTTPS image hosts', () => {
    expect(assertAllowedProductImageUrl('https://m.media-amazon.com/images/I/item.jpg').hostname).toBe('m.media-amazon.com');
    expect(assertAllowedProductImageUrl('https://image.rakuten.co.jp/shop/cabinet/item.png').hostname).toBe('image.rakuten.co.jp');
    expect(assertAllowedProductImageUrl('https://thumbnail.image.rakuten.co.jp/@0_mall/shop/cabinet/item.webp').hostname).toBe('thumbnail.image.rakuten.co.jp');
    expect(assertAllowedProductImageUrl('https://shop.r10s.jp/shop/cabinet/item.jpg').hostname).toBe('shop.r10s.jp');
    expect(assertAllowedProductImageUrl('https://r.r10s.jp/com/img/item.jpg').hostname).toBe('r.r10s.jp');

    expect(() => assertAllowedProductImageUrl('http://m.media-amazon.com/images/I/item.jpg')).toThrow();
    expect(() => assertAllowedProductImageUrl('https://localhost/image.jpg')).toThrow();
    expect(() => assertAllowedProductImageUrl('https://127.0.0.1/image.jpg')).toThrow();
    expect(() => assertAllowedProductImageUrl('https://m.media-amazon.com.evil.test/images/I/item.jpg')).toThrow();
    expect(() => assertAllowedProductImageUrl('https://rakuten.co.jp.evil.test/item.jpg')).toThrow();
    expect(() => assertAllowedProductImageUrl('https://static.rakuten.co.jp/shop/item.jpg')).toThrow();
  });

  it('builds deterministic safe filenames from URL hash and verified image type', () => {
    const amazonName = buildSafeProductImageFilename(
      'https://m.media-amazon.com/images/I/item._AC_SL1500_.jpg?x=1',
      'image/jpeg'
    );
    const rakutenName = buildSafeProductImageFilename(
      'https://image.rakuten.co.jp/shop/cabinet/../../item.png',
      'image/png; charset=binary'
    );

    expect(amazonName).toMatch(/^amazon-[a-f0-9]{24}\.jpg$/);
    expect(rakutenName).toMatch(/^rakuten-[a-f0-9]{24}\.png$/);
    expect(amazonName).not.toContain('..');
    expect(() => buildSafeProductImageFilename('https://image.rakuten.co.jp/shop/file.jpg', 'text/plain')).toThrow();
    expect(() => buildSafeProductImageFilename('https://image.rakuten.co.jp/shop/file.txt', 'text/plain')).toThrow();
  });

  it('deduplicates allowed image URLs and drops disallowed URLs', () => {
    expect(uniqueAllowedImageUrls([
      'https://m.media-amazon.com/images/I/item.jpg',
      'https://m.media-amazon.com/images/I/item.jpg',
      'https://example.com/item.jpg',
      'http://image.rakuten.co.jp/shop/cabinet/item.jpg',
      'https://image.rakuten.co.jp/shop/cabinet/item.jpg',
    ])).toEqual([
      'https://m.media-amazon.com/images/I/item.jpg',
      'https://image.rakuten.co.jp/shop/cabinet/item.jpg',
    ]);
  });

  it('documents first-pass local public storage mode', () => {
    expect(PRODUCT_IMAGE_STORAGE).toBe('local-public-dev');
  });
});
