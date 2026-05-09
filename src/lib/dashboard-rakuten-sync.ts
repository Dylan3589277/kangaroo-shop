import { prisma } from '@/lib/prisma';

type MetricStatus = 'green' | 'yellow' | 'red';

export type DashboardMetric = {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: MetricStatus;
  threshold: {
    yellow: number;
    red: number;
  };
  trend: number;
  trendDirection: 'up' | 'down';
  trendLabel?: string;
};

export type TrendDataPoint = {
  date: string;
  value: number;
};

export type RakutenSyncDashboardData = {
  metrics: DashboardMetric[];
  trendData: Record<string, TrendDataPoint[]>;
};

export async function getRakutenSyncDashboardData(now = new Date()): Promise<RakutenSyncDashboardData> {
  const thirtyDaysAgo = daysAgo(now, 30);
  const sixtyDaysAgo = daysAgo(now, 60);

  const [listings, syncJobs] = await Promise.all([
    prisma.productPlatformListing.findMany({
      where: { platform: 'rakuten' },
      select: {
        status: true,
        platformPrice: true,
        updatedAt: true,
        product: {
          select: {
            stock: true,
            inStock: true,
            isActive: true,
          },
        },
      },
    }),
    prisma.syncJob.findMany({
      where: {
        platform: 'rakuten',
        createdAt: { gte: sixtyDaysAgo },
      },
      select: {
        status: true,
        totalRows: true,
        doneRows: true,
        errorRows: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const totalListings = listings.length;
  const activeListings = listings.filter(item => item.status === 'active').length;
  const sellableProducts = listings.filter(item => item.product.isActive && item.product.inStock && item.product.stock > 0).length;
  const lowStockProducts = listings.filter(item => item.product.isActive && item.product.stock > 0 && item.product.stock <= 5).length;
  const outOfStockProducts = listings.filter(item => item.product.isActive && item.product.stock <= 0).length;
  const prices = listings.map(item => item.platformPrice).filter((value): value is number => typeof value === 'number' && value > 0);
  const avgPlatformPrice = prices.length > 0
    ? Math.round(prices.reduce((sum, value) => sum + value, 0) / prices.length)
    : 0;

  const recentJobs = syncJobs.filter(job => job.createdAt >= thirtyDaysAgo);
  const previousJobs = syncJobs.filter(job => job.createdAt < thirtyDaysAgo);
  const recentImportedRows = recentJobs.reduce((sum, job) => sum + job.doneRows, 0);
  const previousImportedRows = previousJobs.reduce((sum, job) => sum + job.doneRows, 0);
  const recentErrorRows = recentJobs.reduce((sum, job) => sum + job.errorRows, 0);
  const failedRecentJobs = recentJobs.filter(job => job.status === 'failed').length;
  const latestJob = syncJobs.reduce<typeof syncJobs[number] | undefined>((latest, job) => {
    if (!latest) return job;
    return job.createdAt > latest.createdAt ? job : latest;
  }, undefined);
  const recentProcessedRows = recentImportedRows + recentErrorRows;
  const recentImportSuccessRate = recentProcessedRows > 0
    ? Math.round((recentImportedRows / recentProcessedRows) * 1000) / 10
    : 0;

  return {
    metrics: [
      {
        id: 'rakuten-sync-listings',
        name: 'Rakuten同步商品数',
        value: totalListings,
        unit: '件',
        status: totalListings > 0 ? 'green' : 'yellow',
        trend: 0,
        trendDirection: 'up',
        threshold: { yellow: 1, red: 0 },
        trendLabel: '当前同步快照',
      },
      {
        id: 'rakuten-sellable-products',
        name: 'Rakuten可售商品数',
        value: sellableProducts,
        unit: '件',
        status: sellableProducts > 0 ? 'green' : totalListings > 0 ? 'yellow' : 'red',
        trend: 0,
        trendDirection: 'up',
        threshold: { yellow: 1, red: 0 },
        trendLabel: '当前同步快照',
      },
      {
        id: 'rakuten-low-stock-products',
        name: 'Rakuten低库存商品',
        value: lowStockProducts,
        unit: '件',
        status: lowStockProducts === 0 ? 'green' : lowStockProducts <= 5 ? 'yellow' : 'red',
        trend: 0,
        trendDirection: 'down',
        threshold: { yellow: 1, red: 6 },
        trendLabel: '当前同步快照',
      },
      {
        id: 'rakuten-out-of-stock-products',
        name: 'Rakuten缺货商品',
        value: outOfStockProducts,
        unit: '件',
        status: outOfStockProducts === 0 ? 'green' : outOfStockProducts <= 3 ? 'yellow' : 'red',
        trend: 0,
        trendDirection: 'down',
        threshold: { yellow: 1, red: 4 },
        trendLabel: '当前同步快照',
      },
      {
        id: 'rakuten-avg-platform-price',
        name: 'Rakuten平均同步售价',
        value: avgPlatformPrice,
        unit: 'JPY',
        status: avgPlatformPrice > 0 ? 'green' : 'yellow',
        trend: 0,
        trendDirection: 'up',
        threshold: { yellow: 1, red: 0 },
        trendLabel: '当前同步快照',
      },
      {
        id: 'rakuten-rms-imported-rows',
        name: '近30天RMS导入行',
        value: recentImportedRows,
        unit: '行',
        status: failedRecentJobs === 0 ? 'green' : 'yellow',
        trend: percentChange(recentImportedRows, previousImportedRows),
        trendDirection: recentImportedRows >= previousImportedRows ? 'up' : 'down',
        threshold: { yellow: 1, red: 0 },
        trendLabel: '较前30天',
      },
      {
        id: 'rakuten-rms-error-rows',
        name: '近30天RMS错误行',
        value: recentErrorRows,
        unit: '行',
        status: recentErrorRows === 0 ? 'green' : recentErrorRows <= 5 ? 'yellow' : 'red',
        trend: 0,
        trendDirection: 'down',
        threshold: { yellow: 1, red: 6 },
        trendLabel: '近30天累计',
      },
      {
        id: 'rakuten-rms-import-success-rate',
        name: '近30天RMS导入成功率',
        value: recentImportSuccessRate,
        unit: '%',
        status: recentProcessedRows === 0 ? 'yellow' : recentImportSuccessRate >= 98 ? 'green' : recentImportSuccessRate >= 90 ? 'yellow' : 'red',
        trend: 0,
        trendDirection: 'up',
        threshold: { yellow: 98, red: 90 },
        trendLabel: latestJob ? `最新同步: ${latestJob.status}` : '暂无同步作业',
      },
      {
        id: 'rakuten-active-listings',
        name: 'Rakuten已上架记录',
        value: activeListings,
        unit: '件',
        status: activeListings > 0 ? 'green' : totalListings > 0 ? 'yellow' : 'red',
        trend: 0,
        trendDirection: 'up',
        threshold: { yellow: 1, red: 0 },
        trendLabel: '当前同步快照',
      },
    ],
    trendData: {
      'rakuten-rms-imported-rows': buildDailyTrend(now, syncJobs, job => job.doneRows),
      'rakuten-rms-error-rows': buildDailyTrend(now, syncJobs, job => job.errorRows),
    },
  };
}

function buildDailyTrend<T extends { createdAt: Date }>(
  now: Date,
  items: T[],
  valueOf: (item: T) => number,
): TrendDataPoint[] {
  const points: TrendDataPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = daysAgo(now, i);
    const dateStr = date.toISOString().split('T')[0];
    const value = items
      .filter(item => item.createdAt.toISOString().split('T')[0] === dateStr)
      .reduce((sum, item) => sum + valueOf(item), 0);
    points.push({ date: dateStr, value });
  }
  return points;
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
