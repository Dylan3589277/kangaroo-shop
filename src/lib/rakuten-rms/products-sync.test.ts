import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeRakutenRmsProducts,
  rakutenRowsToCsv,
  syncRakutenProductsFromRms,
} from './products-sync';
import { executeImport } from '@/lib/import/sync-job';

vi.mock('@/lib/import/sync-job', () => ({
  executeImport: vi.fn(),
}));

describe('Rakuten RMS products sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes nested items with images, inventory and price', () => {
    const rows = normalizeRakutenRmsProducts({
      data: {
        items: [
          {
            itemNumber: 'SKU-1',
            manageNumber: 'MNG-1',
            itemUrl: 'https://item.rakuten.co.jp/shop/sku-1/',
            itemName: '楽天 RMS 商品',
            itemPrice: '12,800円',
            itemCaption: '説明文',
            inventory: { stockQuantity: '7' },
            images: [
              { imageUrl: 'https://shop.r10s.jp/shop/cabinet/main.jpg' },
              'https://image.rakuten.co.jp/shop/cabinet/detail.jpg',
            ],
          },
        ],
      },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      platformSku: 'SKU-1',
      platformItemId: 'MNG-1',
      titleJa: '楽天 RMS 商品',
      platformPrice: 12800,
      stock: 7,
      description: '説明文',
      platformUrl: 'https://item.rakuten.co.jp/shop/sku-1/',
      images: [
        'https://shop.r10s.jp/shop/cabinet/main.jpg',
        'https://image.rakuten.co.jp/shop/cabinet/detail.jpg',
      ],
    });
  });

  it('normalizes official-style RMS image locations and nested product fields', () => {
    const rows = normalizeRakutenRmsProducts({
      items: [
        {
          item: {
            manageNumber: 'MNG-2',
            title: 'RMS location 画像商品',
            salesPrice: '9,800',
            inventories: [{ inventoryCount: '4' }],
            images: [
              { location: 'https://shop.r10s.jp/shop/cabinet/location-main.jpg' },
              { imageUrl: 'https://image.rakuten.co.jp/shop/cabinet/location-detail.jpg' },
            ],
          },
        },
      ],
    });

    expect(rows[0]).toMatchObject({
      platformSku: 'MNG-2',
      platformItemId: 'MNG-2',
      titleJa: 'RMS location 画像商品',
      platformPrice: 9800,
      stock: 4,
      images: [
        'https://shop.r10s.jp/shop/cabinet/location-main.jpg',
        'https://image.rakuten.co.jp/shop/cabinet/location-detail.jpg',
      ],
    });
  });

  it('converts normalized rows to safely escaped Rakuten CSV', () => {
    const csv = rakutenRowsToCsv([
      {
        rowIndex: 0,
        rawRow: {},
        platformSku: 'SKU"1',
        titleJa: '商品,テスト',
        platformPrice: 1980,
        stock: 3,
        description: '1行目\n2行目',
      },
    ]);

    expect(csv).toContain('"SKU""1"');
    expect(csv).toContain('"商品,テスト"');
    expect(csv).toContain('"1行目\n2行目"');
  });

  it('fetches protected pages and calls executeImport once', async () => {
    vi.mocked(executeImport).mockResolvedValue({
      syncJobId: 'job-1',
      platform: 'rakuten',
      totalRows: 1,
      created: 1,
      updated: 0,
      skipped: 0,
      errors: 0,
    });
    const client = {
      get: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        data: { items: [{ itemNumber: 'SKU-1', itemName: '商品', itemPrice: 1000 }] },
      }),
    };

    const result = await syncRakutenProductsFromRms({
      client: client as never,
      path: '/product/2/search',
      maxPages: 2,
      now: new Date('2026-05-08T20:00:00.000Z'),
    });

    expect(client.get).toHaveBeenCalledWith('/product/2/search', { params: { page: '1' } });
    expect(executeImport).toHaveBeenCalledTimes(1);
    expect(vi.mocked(executeImport).mock.calls[0][0]).toBe('rakuten');
    expect(vi.mocked(executeImport).mock.calls[0][2]).toContain('商品管理番号');
    expect(result).toMatchObject({
      syncJobId: 'job-1',
      created: 1,
      updated: 0,
      skipped: 0,
      errors: 0,
      syncedAt: '2026-05-08T20:00:00.000Z',
    });
  });
});
