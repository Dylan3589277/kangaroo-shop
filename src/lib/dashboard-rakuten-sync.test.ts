import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRakutenSyncDashboardData } from './dashboard-rakuten-sync';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    productPlatformListing: {
      findMany: vi.fn(),
    },
    syncJob: {
      findMany: vi.fn(),
    },
  },
}));

describe('getRakutenSyncDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds Rakuten sync and product operation metrics without sales revenue assumptions', async () => {
    vi.mocked(prisma.productPlatformListing.findMany).mockResolvedValueOnce([
      {
        status: 'active',
        platformPrice: 1980,
        updatedAt: new Date('2026-05-08T00:00:00.000Z'),
        product: { stock: 3, inStock: true, isActive: true },
      },
      {
        status: 'draft',
        platformPrice: 2980,
        updatedAt: new Date('2026-05-08T00:00:00.000Z'),
        product: { stock: 0, inStock: false, isActive: true },
      },
      {
        status: 'inactive',
        platformPrice: null,
        updatedAt: new Date('2026-05-08T00:00:00.000Z'),
        product: { stock: 12, inStock: true, isActive: false },
      },
    ] as never);
    vi.mocked(prisma.syncJob.findMany).mockResolvedValueOnce([
      {
        status: 'done',
        totalRows: 2,
        doneRows: 2,
        errorRows: 0,
        createdAt: new Date('2026-05-08T00:00:00.000Z'),
      },
      {
        status: 'failed',
        totalRows: 3,
        doneRows: 1,
        errorRows: 2,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
      },
      {
        status: 'done',
        totalRows: 4,
        doneRows: 4,
        errorRows: 0,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
      },
    ] as never);

    const result = await getRakutenSyncDashboardData(new Date('2026-05-09T00:00:00.000Z'));
    const metricsById = new Map(result.metrics.map(metric => [metric.id, metric]));

    expect(metricsById.get('rakuten-sync-listings')?.value).toBe(3);
    expect(metricsById.get('rakuten-sellable-products')?.value).toBe(1);
    expect(metricsById.get('rakuten-low-stock-products')?.value).toBe(1);
    expect(metricsById.get('rakuten-out-of-stock-products')?.value).toBe(1);
    expect(metricsById.get('rakuten-avg-platform-price')?.value).toBe(2480);
    expect(metricsById.get('rakuten-rms-imported-rows')?.value).toBe(3);
    expect(metricsById.get('rakuten-rms-imported-rows')?.trend).toBe(-25);
    expect(metricsById.get('rakuten-rms-error-rows')?.value).toBe(2);
    expect(metricsById.get('rakuten-rms-import-success-rate')?.value).toBe(60);
    expect(metricsById.get('rakuten-rms-import-success-rate')?.trendLabel).toBe('最新同步: done');
    expect(Array.from(metricsById.keys()).some(id => id.includes('revenue'))).toBe(false);
    expect(result.healthSummary).toEqual({
      status: 'red',
      latestJobStatus: 'done',
      latestJobAt: new Date('2026-05-08T00:00:00.000Z'),
      latestJobAgeHours: 24,
      recentJobCount: 2,
      failedRecentJobs: 1,
      recentImportedRows: 3,
      recentErrorRows: 2,
      successRate: 60,
      listingCounts: {
        total: 3,
        active: 1,
        sellable: 1,
        outOfStock: 1,
        lowStock: 1,
      },
    });
    expect(result.trendData['rakuten-rms-imported-rows']).toContainEqual({
      date: '2026-05-08',
      value: 2,
    });
  });

  it('returns an empty Rakuten health summary when there are no sync jobs', async () => {
    vi.mocked(prisma.productPlatformListing.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.syncJob.findMany).mockResolvedValueOnce([] as never);

    const result = await getRakutenSyncDashboardData(new Date('2026-05-09T00:00:00.000Z'));

    expect(result.healthSummary).toEqual({
      status: 'yellow',
      latestJobStatus: null,
      latestJobAt: null,
      latestJobAgeHours: null,
      recentJobCount: 0,
      failedRecentJobs: 0,
      recentImportedRows: 0,
      recentErrorRows: 0,
      successRate: 0,
      listingCounts: {
        total: 0,
        active: 0,
        sellable: 0,
        outOfStock: 0,
        lowStock: 0,
      },
    });
    expect(result.trendData['rakuten-rms-imported-rows']).toHaveLength(30);
    expect(result.trendData['rakuten-rms-error-rows']).toHaveLength(30);
  });
});
