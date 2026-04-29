import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { refreshDashboardAlerts } from '@/lib/dashboard-alerts';
import { requireAdminSession } from '@/lib/admin-auth';

export async function GET() {
  try {
    const { response } = await requireAdminSession();
    if (response) return response;

    // Refresh auto-generated alerts before fetching overview
    await refreshDashboardAlerts();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [recentOrders, allPaidOrders, allOrders, products, alerts] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        include: { items: true },
      }),
      prisma.order.findMany({ where: { paymentStatus: 'paid' } }),
      prisma.order.findMany(),
      prisma.product.findMany({ where: { isActive: true } }),
      prisma.dashboardAlert.findMany({
        where: { resolvedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // 计算月营收
    const monthRevenue = allPaidOrders.reduce((sum, o) => sum + o.total, 0);

    // 计算月订单数
    const monthOrderCount = recentOrders.length;

    // 计算客单价
    const avgOrderValue = monthOrderCount > 0
      ? recentOrders.reduce((sum, o) => sum + o.total, 0) / monthOrderCount
      : 0;

    // 计算转化率（使用 paid 订单占总订单的大致比例，后续可对接埋点）
    const totalOrderCount = allOrders.length;
    const paidOrderCount = allPaidOrders.length;
    const conversionRate = totalOrderCount > 0
      ? Math.round((paidOrderCount / totalOrderCount) * 100 * 10) / 10
      : 0;

    // 计算平均评分
    const avgRating = products.length > 0
      ? products.reduce((sum, p) => sum + p.rating, 0) / products.length
      : 0;

    // 计算退货率
    const refundedOrders = allPaidOrders.filter(o => o.paymentStatus === 'refunded').length;
    const returnRate = allPaidOrders.length > 0
      ? (refundedOrders / allPaidOrders.length) * 100
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
    ];

    // 生成趋势数据（最近30天每日营收和订单数）
    const dailyRevenue: { date: string; value: number }[] = [];
    const dailyOrderCount: { date: string; value: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayOrders = recentOrders.filter(o => {
        const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
        return orderDate === dateStr;
      });
      const dayRevenue = dayOrders.reduce((sum, o) => sum + o.total, 0);
      dailyRevenue.push({ date: dateStr, value: dayRevenue });
      dailyOrderCount.push({ date: dateStr, value: dayOrders.length });
    }
    const trendData: Record<string, { date: string; value: number }[]> = {
      revenue: dailyRevenue,
      'order-count': dailyOrderCount,
    };

    return NextResponse.json({
      data: { metrics, alerts, trendData },
      error: null,
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to fetch dashboard overview' },
      { status: 500 }
    );
  }
}
