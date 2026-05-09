import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serverError } from '@/lib/api-error';
import { refreshDashboardAlerts } from '@/lib/dashboard-alerts';
import { requireAdminSession } from '@/lib/admin-auth';
import { getRakutenSyncDashboardData } from '@/lib/dashboard-rakuten-sync';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { response } = await requireAdminSession();
    if (response) return response;

    // Refresh auto-generated alerts before fetching overview
    await refreshDashboardAlerts();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Use aggregate/count instead of full findMany to avoid loading all rows into memory.
    // recentOrders only needs minimal fields for trend computation.
    const [
      recentOrders,
      revenueAgg,
      paidCount,
      totalCount,
      refundedCount,
      ratingAgg,
      alerts,
      rakutenSync,
    ] = await Promise.all([
      // Recent 30-day orders — select only the columns we actually use
      prisma.order.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { total: true, paymentStatus: true, createdAt: true },
      }),
      // Monthly revenue = paid orders within the last 30 days only
      prisma.order.aggregate({
        _sum: { total: true },
        where: { paymentStatus: 'paid', createdAt: { gte: thirtyDaysAgo } },
      }),
      // Total paid order count (for conversion rate denominator)
      prisma.order.count({ where: { paymentStatus: 'paid' } }),
      // Total order count (for conversion rate)
      prisma.order.count(),
      // Refunded count (for return-rate numerator — kept separate so denominator is correct)
      prisma.order.count({ where: { paymentStatus: 'refunded' } }),
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

    // 月营收：最近 30 天 paid 订单之和
    const monthRevenue = revenueAgg._sum.total ?? 0;

    // 月订单数（含所有支付状态，口径与原来保持一致）
    const monthOrderCount = recentOrders.length;

    // 客单价：最近 30 天所有订单的平均金额
    const avgOrderValue = monthOrderCount > 0
      ? recentOrders.reduce((sum, o) => sum + o.total, 0) / monthOrderCount
      : 0;

    // 转化率 = paid / total（不含 refunded 以避免双计）
    const conversionRate = totalCount > 0
      ? Math.round((paidCount / totalCount) * 100 * 10) / 10
      : 0;

    // 平均评分
    const avgRating = ratingAgg._avg.rating ?? 0;

    // 退货率 = refunded / (paid + refunded)，分母>0 保证除 0 安全
    const completedCount = paidCount + refundedCount;
    const returnRate = completedCount > 0
      ? (refundedCount / completedCount) * 100
      : 0;

    // 构建指标卡片
    const metrics = [
      {
        id: 'revenue',
        name: '月营收',
        value: monthRevenue,
        unit: 'JPY',
        status: 'green' as const,
        trend: 12.5,
        trendDirection: 'up' as const,
        threshold: { yellow: 500000, red: 300000 },
      },
      {
        id: 'order-count',
        name: '月订单数',
        value: monthOrderCount,
        unit: '笔',
        status: monthOrderCount > 10 ? 'green' as const : 'yellow' as const,
        trend: 8.3,
        trendDirection: 'up' as const,
        threshold: { yellow: 10, red: 5 },
      },
      {
        id: 'avg-order-value',
        name: '客单价',
        value: Math.round(avgOrderValue),
        unit: 'JPY',
        status: avgOrderValue > 3000 ? 'green' as const : 'yellow' as const,
        trend: -2.1,
        trendDirection: 'down' as const,
        threshold: { yellow: 3000, red: 2000 },
      },
      {
        id: 'conversion-rate',
        name: '转化率',
        value: conversionRate,
        unit: '%',
        status: conversionRate > 30 ? 'green' as const : conversionRate > 15 ? 'yellow' as const : 'red' as const,
        trend: 0.5,
        trendDirection: 'up' as const,
        threshold: { yellow: 30, red: 15 },
      },
      {
        id: 'rating',
        name: '平均评分',
        value: Math.round(avgRating * 10) / 10,
        unit: '分',
        status: avgRating >= 4.2 ? 'green' as const : avgRating >= 3.8 ? 'yellow' as const : 'red' as const,
        trend: 0.1,
        trendDirection: 'up' as const,
        threshold: { yellow: 4.2, red: 3.8 },
      },
      {
        id: 'return-rate',
        name: '退货率',
        value: Math.round(returnRate * 10) / 10,
        unit: '%',
        status: returnRate < 5 ? 'green' as const : returnRate < 10 ? 'yellow' as const : 'red' as const,
        trend: -0.3,
        trendDirection: 'down' as const,
        threshold: { yellow: 5, red: 10 },
      },
      ...rakutenSync.metrics.slice(0, 4),
    ];

    // 生成趋势数据（最近30天每日营收[paid only]和订单数）
    const dailyRevenue: { date: string; value: number }[] = [];
    const dailyOrderCount: { date: string; value: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayOrders = recentOrders.filter(o => {
        const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
        return orderDate === dateStr;
      });
      // 日趋势营收只统计 paid 订单
      const dayRevenue = dayOrders
        .filter(o => o.paymentStatus === 'paid')
        .reduce((sum, o) => sum + o.total, 0);
      dailyRevenue.push({ date: dateStr, value: dayRevenue });
      dailyOrderCount.push({ date: dateStr, value: dayOrders.length });
    }
    const trendData: Record<string, { date: string; value: number }[]> = {
      revenue: dailyRevenue,
      'order-count': dailyOrderCount,
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
