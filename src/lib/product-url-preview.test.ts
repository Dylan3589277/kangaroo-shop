import { describe, expect, it } from 'vitest';
import {
  assertAllowedProductUrl,
  decodeProductHtml,
  detectProductUrlSource,
  htmlEncodingFromContentType,
  parseProductPreviewHtml,
  parseYenPrice,
} from './product-url-preview';

describe('product-url-preview domain whitelist', () => {
  it('allows Japanese Amazon and Rakuten product hosts', () => {
    expect(detectProductUrlSource('https://www.amazon.co.jp/dp/B000000000')).toBe('amazon');
    expect(detectProductUrlSource('https://amazon.co.jp/dp/B000000000')).toBe('amazon');
    expect(detectProductUrlSource('https://item.rakuten.co.jp/shop/item/')).toBe('rakuten');
    expect(detectProductUrlSource('https://books.rakuten.co.jp/rb/123456/')).toBe('rakuten');
    expect(detectProductUrlSource('https://rakuten.co.jp/')).toBe('rakuten');
  });

  it('rejects unsupported domains and non-http protocols', () => {
    expect(detectProductUrlSource('https://amazon.com/dp/B000000000')).toBeNull();
    expect(detectProductUrlSource('https://www.rakuten.com/')).toBeNull();
    expect(detectProductUrlSource('https://rakuten.co.jp.evil.test/item')).toBeNull();
    expect(detectProductUrlSource('http://www.amazon.co.jp/dp/B000000000')).toBeNull();
    expect(detectProductUrlSource('file:///etc/passwd')).toBeNull();
    expect(() => assertAllowedProductUrl('https://127.0.0.1/admin')).toThrow();
  });
});

describe('parseYenPrice', () => {
  it('normalizes Japanese yen prices to integers', () => {
    expect(parseYenPrice('￥1,980')).toBe(1980);
    expect(parseYenPrice('１，２３４円')).toBe(1234);
    expect(parseYenPrice('2,480.4')).toBe(2480);
  });
});

describe('parseProductPreviewHtml', () => {
  it('extracts Amazon product data from JSON-LD, meta tags and common fields', () => {
    const html = `
      <html>
        <head>
          <meta property="og:image" content="https://m.media-amazon.com/images/I/abc._AC_SL1500_.jpg">
          <meta property="og:description" content="Meta description">
          <script type="application/ld+json">
            {
              "@type": "Product",
              "name": "テスト商品",
              "brand": { "@type": "Brand", "name": "テストブランド" },
              "image": ["https://m.media-amazon.com/images/I/json.jpg"],
              "description": "JSON-LD description",
              "offers": { "@type": "Offer", "price": "1980", "priceCurrency": "JPY" }
            }
          </script>
        </head>
        <body>
          <span id="bylineInfo">Brand: Ignored Brand</span>
          <img data-old-hires="https://m.media-amazon.com/images/I/hires.jpg">
        </body>
      </html>
    `;

    const preview = parseProductPreviewHtml(html, 'https://www.amazon.co.jp/dp/B000000000?tag=test#hash');
    expect(preview).toMatchObject({
      source: 'amazon',
      sourceUrl: 'https://www.amazon.co.jp/dp/B000000000?tag=test',
      title: 'テスト商品',
      titleJa: 'テスト商品',
      brand: 'テストブランド',
      price: 1980,
      description: 'JSON-LD description',
    });
    expect(preview.images).toEqual([
      'https://m.media-amazon.com/images/I/abc.jpg',
      'https://m.media-amazon.com/images/I/json.jpg',
      'https://m.media-amazon.com/images/I/hires.jpg',
    ]);
  });

  it('filters non-image Amazon URLs captured from image-like page data', () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Amazon Image Filter Test">
          <meta property="og:image" content="https://m.media-amazon.com/images/I/main._AC_SL1500_.jpg">
        </head>
        <body>
          <script>
            window.assets = [
              "https://m.media-amazon.com/images/I/not-image.css",
              "https://m.media-amazon.com/images/I/not-image.js",
              "https://m.media-amazon.com/images/I/valid._AC_SL1000_.webp"
            ];
          </script>
        </body>
      </html>
    `;

    const preview = parseProductPreviewHtml(html, 'https://www.amazon.co.jp/dp/B000000000');
    expect(preview.images).toEqual([
      'https://m.media-amazon.com/images/I/main.jpg',
      'https://m.media-amazon.com/images/I/valid.webp',
    ]);
  });

  it('extracts Rakuten product data from meta tags and price classes', () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="楽天テスト商品">
          <meta property="og:image" content="https://image.rakuten.co.jp/shop/cabinet/item.jpg">
          <meta name="description" content="楽天の商品説明">
        </head>
        <body>
          <span class="brand">楽天ブランド</span>
          <span class="price2">3,300円</span>
          <img src="https:\\/\\/thumbnail.image.rakuten.co.jp\\/@0_mall\\/shop\\/cabinet\\/thumb.jpg">
        </body>
      </html>
    `;

    const preview = parseProductPreviewHtml(html, 'https://item.rakuten.co.jp/shop/item/');
    expect(preview).toMatchObject({
      source: 'rakuten',
      title: '楽天テスト商品',
      titleJa: '楽天テスト商品',
      brand: '楽天ブランド',
      price: 3300,
      description: '楽天の商品説明',
    });
    expect(preview.images).toEqual([
      'https://image.rakuten.co.jp/shop/cabinet/item.jpg',
      'https://thumbnail.image.rakuten.co.jp/@0_mall/shop/cabinet/thumb.jpg',
    ]);
  });
});

describe('decodeProductHtml', () => {
  it('detects Japanese HTML charsets from content type headers', () => {
    expect(htmlEncodingFromContentType('text/html;charset=EUC-JP')).toBe('euc-jp');
    expect(htmlEncodingFromContentType('text/html; charset=Shift_JIS')).toBe('shift_jis');
    expect(htmlEncodingFromContentType('text/html; charset=UTF-8')).toBe('utf-8');
  });

  it('decodes EUC-JP and Shift_JIS bytes when the response declares those charsets', () => {
    expect(decodeProductHtml(Buffer.from('b3dac5b7bea6c9ca', 'hex'), 'text/html;charset=EUC-JP')).toBe('楽天商品');
    expect(decodeProductHtml(Buffer.from('8a7993568fa49569', 'hex'), 'text/html;charset=Shift_JIS')).toBe('楽天商品');
  });
});
