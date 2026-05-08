import { describe, expect, it } from 'vitest';
import {
  assertAllowedProductUrl,
  decodeProductHtml,
  detectProductUrlSource,
  htmlEncodingFromContentType,
  hasUsefulProductPreview,
  parseProductPreviewHtml,
  parseYenPrice,
  resolveKnownProductUrlTarget,
} from './product-url-preview';

describe('product-url-preview domain whitelist', () => {
  it('allows Japanese Amazon and Rakuten product hosts', () => {
    expect(detectProductUrlSource('https://www.amazon.co.jp/dp/B000000000')).toBe('amazon');
    expect(detectProductUrlSource('https://amazon.co.jp/dp/B000000000')).toBe('amazon');
    expect(detectProductUrlSource('https://item.rakuten.co.jp/shop/item/')).toBe('rakuten');
    expect(detectProductUrlSource('https://books.rakuten.co.jp/rb/123456/')).toBe('rakuten');
    expect(detectProductUrlSource('https://rakuten.co.jp/')).toBe('rakuten');
  });

  it('allows common Japanese marketplace short links so redirects can be resolved safely', () => {
    expect(detectProductUrlSource('https://amzn.asia/d/example')).toBe('amazon');
    expect(detectProductUrlSource('https://a.r10.to/hExample')).toBe('rakuten');
    expect(detectProductUrlSource('https://r10.to/hExample')).toBe('rakuten');
    expect(detectProductUrlSource('https://hb.afl.rakuten.co.jp/hgc/example')).toBe('rakuten');
    expect(assertAllowedProductUrl('https://amzn.asia/d/example#ref')).toEqual({
      source: 'amazon',
      normalizedUrl: 'https://amzn.asia/d/example',
    });
    expect(assertAllowedProductUrl('https://a.r10.to/hExample?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fshop%2Fitem%2F')).toEqual({
      source: 'rakuten',
      normalizedUrl: 'https://a.r10.to/hExample?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fshop%2Fitem%2F',
    });
  });

  it('resolves Rakuten short-link pc targets only after validating the decoded URL', () => {
    expect(resolveKnownProductUrlTarget('https://a.r10.to/hExample?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fshop%2Fitem%2F')).toBe(
      'https://item.rakuten.co.jp/shop/item/'
    );
    expect(resolveKnownProductUrlTarget('https://a.r10.to/hExample?pc=https%3A%2F%2Fbooks.rakuten.co.jp%2Frb%2F123456%2F')).toBe(
      'https://books.rakuten.co.jp/rb/123456/'
    );
  });

  it('normalizes Amazon product pages with search tracking paths to canonical dp URLs', () => {
    expect(assertAllowedProductUrl(
      'https://www.amazon.co.jp/Pocket-%E7%B2%BE%E5%AF%86%E3%83%95%E3%82%A3%E3%83%83%E3%83%88/dp/B0GZJF3NF2/ref=sr_1_7?keywords=DJI&qid=1778239986&sr=8-7#customerReviews'
    )).toEqual({
      source: 'amazon',
      normalizedUrl: 'https://www.amazon.co.jp/dp/B0GZJF3NF2',
    });
    expect(assertAllowedProductUrl('https://amazon.co.jp/gp/product/b0gzjf3nf2?psc=1&tag=tracking')).toEqual({
      source: 'amazon',
      normalizedUrl: 'https://www.amazon.co.jp/dp/B0GZJF3NF2',
    });
  });

  it('normalizes Rakuten item pages with tracking query params to canonical product URLs', () => {
    expect(assertAllowedProductUrl(
      'https://item.rakuten.co.jp/classe17/socks003/?s-id=top_normal_browsehist&xuseflg_ichiba01=10000037&scid=af_pc_etc'
    )).toEqual({
      source: 'rakuten',
      normalizedUrl: 'https://item.rakuten.co.jp/classe17/socks003/',
    });
    expect(resolveKnownProductUrlTarget(
      'https://item.rakuten.co.jp/classe17/socks003?s-id=top_normal_browsehist&xuseflg_ichiba01=10000037'
    )).toBe('https://item.rakuten.co.jp/classe17/socks003/');
  });

  it('rejects unsafe Rakuten short-link pc targets', () => {
    expect(() => resolveKnownProductUrlTarget('https://a.r10.to/hExample?pc=https%3A%2F%2F127.0.0.1%2Fadmin')).toThrow();
    expect(() => resolveKnownProductUrlTarget('https://a.r10.to/hExample?pc=https%3A%2F%2Fevil.test%2Fitem')).toThrow();
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
      sourceUrl: 'https://www.amazon.co.jp/dp/B000000000',
      title: 'テスト商品',
      titleJa: 'テスト商品',
      brand: 'テストブランド',
      price: 1980,
      description: 'JSON-LD description',
    });
    expect(preview.images).toEqual([
      'https://m.media-amazon.com/images/I/hires.jpg',
      'https://m.media-amazon.com/images/I/abc.jpg',
      'https://m.media-amazon.com/images/I/json.jpg',
    ]);
  });

  it('prefers Amazon product description, cleaned store brand and high-resolution product images', () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Amazon Priority Test">
          <meta name="description" content="SEO keyword text that should not win">
          <meta property="og:image" content="https://m.media-amazon.com/images/I/og-low._AC_SL300_.jpg">
        </head>
        <body>
          <a id="bylineInfo">LIV HEARTのストアを表示</a>
          <div id="productDescription"><p>商品そのものの説明です。</p></div>
          <div id="feature-bullets"><ul><li>箇条書き説明</li></ul></div>
          <img id="landingImage"
            data-old-hires="https://m.media-amazon.com/images/I/old-hires._AC_SL1500_.jpg"
            data-a-dynamic-image="{&quot;https://m.media-amazon.com/images/I/dynamic-hires._AC_SL1500_.jpg&quot;:[1500,1500]}">
          <script>
            window.ImageBlockATF = {
              colorImages: {
                initial: [
                  { hiRes: "https://m.media-amazon.com/images/I/color-hires._AC_SL1500_.jpg", large: "https://m.media-amazon.com/images/I/color-low._AC_SL500_.jpg" }
                ]
              }
            };
            window.ads = ["https://m.media-amazon.com/images/I/page-scan-low._AC_SL160_.jpg"];
          </script>
        </body>
      </html>
    `;

    const preview = parseProductPreviewHtml(html, 'https://www.amazon.co.jp/dp/B000000000');
    expect(preview.brand).toBe('LIV HEART');
    expect(preview.description).toBe('商品そのものの説明です。');
    expect(preview.images.slice(0, 3)).toEqual([
      'https://m.media-amazon.com/images/I/color-hires.jpg',
      'https://m.media-amazon.com/images/I/old-hires.jpg',
      'https://m.media-amazon.com/images/I/dynamic-hires.jpg',
    ]);
    expect(preview.images.indexOf('https://m.media-amazon.com/images/I/page-scan-low.jpg')).toBeGreaterThan(2);
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

    const preview = parseProductPreviewHtml(
      html,
      'https://item.rakuten.co.jp/shop/item/?s-id=top_normal_browsehist&xuseflg_ichiba01=10000037'
    );
    expect(preview).toMatchObject({
      source: 'rakuten',
      sourceUrl: 'https://item.rakuten.co.jp/shop/item/',
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

  it('extracts Rakuten price from itemprop or ratPrice and keeps product images ahead of shop decoration', () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="楽天価格画像テスト">
          <meta property="og:image" content="https://shop.r10s.jp/shop/cabinet/product-main.jpg">
          <meta itemprop="price" content="2180">
          <meta itemprop="image" content="https://tshop.r10s.jp/shop/cabinet/product-sub.jpg">
        </head>
        <body>
          <script>var ratPrice=2180;</script>
          <style>
            .banner { background-image: url(https://image.rakuten.co.jp/shop/campaign/banner.jpg); }
            .kanban { background-image: url(https://image.rakuten.co.jp/shop/kanban/header.jpg); }
          </style>
          <img src="https://image.rakuten.co.jp/shop/cabinet/detail.jpg);">
        </body>
      </html>
    `;

    const preview = parseProductPreviewHtml(html, 'https://item.rakuten.co.jp/shop/item/');
    expect(preview.price).toBe(2180);
    expect(preview.images).toEqual([
      'https://shop.r10s.jp/shop/cabinet/product-main.jpg',
      'https://tshop.r10s.jp/shop/cabinet/product-sub.jpg',
      'https://image.rakuten.co.jp/shop/cabinet/detail.jpg',
    ]);

    const ratPriceOnly = parseProductPreviewHtml(
      '<html><head><meta property="og:title" content="ratPrice only"></head><body><script>ratPrice="2180";</script></body></html>',
      'https://item.rakuten.co.jp/shop/item/'
    );
    expect(ratPriceOnly.price).toBe(2180);
  });

  it('decodes EUC-JP Rakuten HTML and extracts common product fields', () => {
    const titleBytes = Buffer.from('b3dac5b7bea6c9ca', 'hex');
    const htmlBytes = Buffer.concat([
      Buffer.from(`
        <html>
          <head>
            <meta property="og:title" content="`, 'ascii'),
      titleBytes,
      Buffer.from(`">
            <meta property="og:image" content="https://shop.r10s.jp/shop/cabinet/product-main.jpg">
          </head>
          <body>
            <script>var ratPrice = "12,800";</script>
            <img src="https://tshop.r10s.jp/shop/cabinet/product-sub.jpg">
            <img src="https://image.rakuten.co.jp/shop/cabinet/detail.jpg">
          </body>
        </html>
      `, 'ascii'),
    ]);
    const html = decodeProductHtml(htmlBytes, 'text/html; charset=EUC-JP');

    const preview = parseProductPreviewHtml(html, 'https://item.rakuten.co.jp/shop/item/');

    expect(preview).toMatchObject({
      source: 'rakuten',
      sourceUrl: 'https://item.rakuten.co.jp/shop/item/',
      title: '楽天商品',
      titleJa: '楽天商品',
      price: 12800,
    });
    expect(preview.images).toEqual([
      'https://shop.r10s.jp/shop/cabinet/product-main.jpg',
      'https://tshop.r10s.jp/shop/cabinet/product-sub.jpg',
      'https://image.rakuten.co.jp/shop/cabinet/detail.jpg',
    ]);
  });

  it('treats marketplace error pages with only an error title as unusable preview', () => {
    const preview = parseProductPreviewHtml(
      '<html><head><title>ページが見つかりません</title></head><body>not found</body></html>',
      'https://www.amazon.co.jp/dp/B000000000'
    );

    expect(preview.title).toBe('ページが見つかりません');
    expect(hasUsefulProductPreview(preview)).toBe(false);
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
