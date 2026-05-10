import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serverError } from '@/lib/api-error';
import { refreshDashboardAlerts } from '@/lib/dashboard-alerts';
import { requireAdminSession } from '@/lib/admin-auth';
import { getRakutenSyncDashboardData } from '@/lib/dashboard-rakuten-sync';
import { parseDashboardDateRange } from '@/lib/dashboard-date-range';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { response } = await requireAdminSession();
    if (response) return response;

    const parsedRange = parseDashboardDateRange(new URL(req.url).searchParams);
    if (parsedRange.response) return parsedRange.response;
    const { range } = parsedRange;

    // Refresh auto-generated alerts before fetching overview
    await refreshDashboardAlerts();

    const now = new Date();
    const createdAtRange = { gte: range.startDate, lt: range.endExclusiveDate };

    // Use aggregate/count instead of full findMany to avoid loading all rows into memory.
    // recentOrders only needs minimal fields for trend computation.
    const [
      recentOrders,
      revenueAgg,
      recentPaidCount,
      refundedCount,
      ratingAgg,
      alerts,
      rakutenSync,
    ] = await Promise.all([
      // Orders in the selected date range — select only the columns we actually use
      prisma.order.findMany({
        where: { createdAt: createdAtRange },
        select: { total: true, paymentStatus: true, createdAt: true },
      }),
      // Revenue = paid orders within the selected date range only
      prisma.order.aggregate({
        _sum: { total: true },
        where: { paymentStatus: 'paid', createdAt: createdAtRange },
      }),
      // Paid order count in the same selected window as the dashboard card.
      prisma.order.count({ where: { paymentStatus: 'paid', createdAt: createdAtRange } }),
      // Refunded count in the same selected window as the dashboard card.
      prisma.order.count({ where: { paymentStatus: 'refunded', createdAt: createdAtRange } }),
      // Average rating across active products
      prisma.product.aggregate({
        _avg: { rating: true },
        where: { isActive: true },
      }),
      prisma.dashboardAlert.findMany({
        where: { resolvedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
      getRakutenSyncDashboardData(now),
    ]);

    // 营收：所选范围 paid 订单之和
    const monthRevenue = revenueAgg._sum.total ?? 0;

    // 订单数（含所有支付状态，口径与原来保持一致）
    const monthOrderCount = recentOrders.length;

    // 客单价：所选范围 paid 订单总额 / paid 订单数
    const avgOrderValue = recentPaidCount > 0
      ? (revenueAgg._sum.total ?? 0) / recentPaidCount
      : 0;

    // 转化率 = 所选范围 paid 订单 / 所选范围全部订单，窗口与卡片一致
    const conversionRate = monthOrderCount > 0
      ? Math.round((recentPaidCount / monthOrderCount) * 100 * 10) / 10
      : 0;

    // 平均评分
    const avgRating = ratingAgg._avg.rating ?? 0;

    // 退货率 = 所选范围 refunded / (paid + refunded)，分母>0 保证除 0 安全
    const completedCount = recentPaidCount + refundedCount;
    const returnRate = completedCount > 0
      ? (refundedCount / completedCount) * 100
      : 0;

    // 构建指标卡片
    const metrics = [
      {
        id: 'revenue',
        name: '营收',
        value: monthRevenue,
        unit: 'JPY',
        status: 'green' as const,
        trend: 0,
        trendDirection: 'up' as const,
        trendLabel: '待接入',
        threshold: { yellow: 500000, red: 300000 },
      },
      {
        id: 'order-count',
        name: '订单数',
        value: monthOrderCount,
        unit: '笔',
        status: monthOrderCount > 10 ? 'green' as const : 'yellow' as const,
        trend: 0,
        trendDirection: 'up' as const,
        trendLabel: '待接入',
        threshold: { yellow: 10, red: 5 },
      },
      {
        id: 'avg-order-value',
        name: '客单价',
        value: Math.round(avgOrderValue),
        unit: 'JPY',
        status: avgOrderValue > 3000 ? 'green' as const : 'yellow' as const,
        trend: 0,
        trendDirection: 'up' as const,
        trendLabel: '待接入',
        threshold: { yellow: 3000, red: 2000 },
      },
      {
        id: 'conversion-rate',
        name: '转化率',
        value: conversionRate,
        unit: '%',
        status: conversionRate > 30 ? 'green' as const : conversionRate > 15 ? 'yellow' as const : 'red' as const,
        trend: 0,
        trendDirection: 'up' as const,
        trendLabel: '待接入',
        threshold: { yellow: 30, red: 15 },
      },
      {
        id: 'rating',
        name: '平均评分',
        value: Math.round(avgRating * 10) / 10,
        unit: '分',
        status: avgRating >= 4.2 ? 'green' as const : avgRating >= 3.8 ? 'yellow' as const : 'red' as const,
        trend: 0,
        trendDirection: 'up' as const,
        trendLabel: '待接入',
        threshold: { yellow: 4.2, red: 3.8 },
      },
      {
        id: 'return-rate',
        name: '退货率',
        value: Math.round(returnRate * 10) / 10,
        unit: '%',
        status: returnRate < 5 ? 'green' as const : returnRate < 10 ? 'yellow' as const : 'red' as const,
        trend: 0,
        trendDirection: 'up' as const,
        trendLabel: '待接入',
        threshold: { yellow: 5, red: 10 },
      },
      ...rakutenSync.metrics.slice(0, 4),
    ];

    // 生成趋势数据（所选范围每日营收[paid only]和订单数）
    const dailyRevenue: { date: string; value: number }[] = [];
    const dailyOrderCount: { date: string; value: number }[] = [];
    const dailyAvgOrderValue: { date: string; value: number }[] = [];
    const dailyConversionRate: { date: string; value: number }[] = [];
    for (const dateStr of range.days) {
      const dayOrders = recentOrders.filter(o => {
        const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
        return orderDate === dateStr;
      });
      // 日趋势营收只统计 paid 订单
      const dayRevenue = dayOrders
        .filter(o => o.paymentStatus === 'paid')
        .reduce((sum, o) => sum + o.total, 0);
      const dayPaidOrders = dayOrders.filter(o => o.paymentStatus === 'paid');
      const dayAvgOrderValue = dayPaidOrders.length > 0
        ? Math.round(dayRevenue / dayPaidOrders.length)
        : 0;
      const dayConversionRate = dayOrders.length > 0
        ? Math.round((dayPaidOrders.length / dayOrders.length) * 100 * 10) / 10
        : 0;
      dailyRevenue.push({ date: dateStr, value: dayRevenue });
      dailyOrderCount.push({ date: dateStr, value: dayOrders.length });
      dailyAvgOrderValue.push({ date: dateStr, value: dayAvgOrderValue });
      dailyConversionRate.push({ date: dateStr, value: dayConversionRate });
    }
    const trendData: Record<string, { date: string; value: number }[]> = {
      revenue: dailyRevenue,
      'order-count': dailyOrderCount,
      'avg-order-value': dailyAvgOrderValue,
      'conversion-rate': dailyConversionRate,
      ...rakutenSync.trendData,
    };

    return NextResponse.json({
      data: { metrics, alerts, trendData },
      error: null,
    });
  } catch (error) {
    return serverError(error, { data: null, error: 'Failed to fetch dashboard overview' });
  }
}
