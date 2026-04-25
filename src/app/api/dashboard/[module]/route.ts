import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { refreshDashboardAlerts } from '@/lib/dashboard-alerts';

// 模块类型
type ModuleType = 'hr' | 'finance' | 'supply_chain' | 'operation' | 'influencer';

// 各模块的指标配置
const moduleConfigs: Record<ModuleType, { name: string; metrics: { id: string; name: string; unit: string }[] }> = {
  operation: {
    name: '运营模块',
    metrics: [
      { id: 'conversion-rate', name: '转化率', unit: '%' },
      { id: 'avg-order-value', name: '客单价', unit: 'JPY' },
      { id: 'rating', name: '店铺评分', unit: '分' },
      { id: 'return-rate', name: '退货率', unit: '%' },
    ],
  },
  hr: {
    name: '人事模块',
    metrics: [
      { id: 'employee-count', name: '员工数', unit: '人' },
      { id: 'turnover-rate', name: '离职率', unit: '%' },
      { id: 'avg-salary', name: '平均薪资', unit: 'JPY' },
    ],
  },
  finance: {
    name: '财务模块',
    metrics: [
      { id: 'gross-margin', name: '毛利率', unit: '%' },
      { id: 'net-margin', name: '净利率', unit: '%' },
      { id: 'cash-flow', name: '现金流', unit: 'JPY' },
    ],
  },
  supply_chain: {
    name: '供应链模块',
    metrics: [
      { id: 'inventory-turnover', name: '库存周转率', unit: '次' },
      { id: 'on-time-delivery', name: '准时交货率', unit: '%' },
      { id: 'stock-overflow', name: '积压库存', unit: '件' },
    ],
  },
  influencer: {
    name: '红人模块',
    metrics: [
      { id: 'influencer-count', name: '合作红人数', unit: '人' },
      { id: 'influencer-roi', name: '红人ROI', unit: '' },
      { id: 'engagement-rate', name: '互动率', unit: '%' },
    ],
  },
};

export async function GET(
  req: Request,
  { params }: { params: { module: string } }
) {
  try {
    const moduleId = params.module as ModuleType;

    // 验证模块类型
    if (!moduleConfigs[moduleId]) {
      return NextResponse.json(
        { data: null, error: 'Invalid module type' },
        { status: 400 }
      );
    }

    const config = moduleConfigs[moduleId];

    // 获取未解决的告警
    const alerts = await prisma.dashboardAlert.findMany({
      where: { module: moduleId, resolvedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    // 运营模块可以从现有数据计算
    if (moduleId === 'operation') {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Refresh auto-generated alerts
      await refreshDashboardAlerts();

      const [recentOrders, products, allPaidOrders, allOrders] = await Promise.all([
        prisma.order.findMany({
          where: { createdAt: { gte: thirtyDaysAgo } },
          include: { items: true },
        }),
        prisma.product.findMany({ where: { isActive: true } }),
        prisma.order.findMany({ where: { paymentStatus: 'paid' } }),
        prisma.order.findMany(),
      ]);

      const avgOrderValue = recentOrders.length > 0
        ? recentOrders.reduce((sum, o) => sum + o.total, 0) / recentOrders.length
        : 0;

      const avgRating = products.length > 0
        ? products.reduce((sum, p) => sum + p.rating, 0) / products.length
        : 0;

      const refundedCount = allPaidOrders.filter(o => o.paymentStatus === 'refunded').length;
      const returnRate = allPaidOrders.length > 0
        ? (refundedCount / allPaidOrders.length) * 100
        : 0;

      // 计算转化率
      const totalOrderCount = allOrders.length;
      const paidOrderCount = allPaidOrders.length;
      const conversionRate = totalOrderCount > 0
        ? Math.round((paidOrderCount / totalOrderCount) * 100 * 10) / 10
        : 0;

      const metrics = [
        {
          id: 'conversion-rate',
          name: '转化率',
          value: conversionRate,
          unit: '%',
          status: conversionRate > 30 ? 'green' : conversionRate > 15 ? 'yellow' : 'red',
          trend: 0.5,
          trendDirection: 'up',
          threshold: { yellow: 30, red: 15 },
        },
        {
          id: 'avg-order-value',
          name: '客单价',
          value: Math.round(avgOrderValue),
          unit: 'JPY',
          status: avgOrderValue > 3000 ? 'green' : 'yellow',
          trend: -2.1,
          trendDirection: 'down',
          threshold: { yellow: 3000, red: 2000 },
        },
        {
          id: 'rating',
          name: '店铺评分',
          value: Math.round(avgRating * 10) / 10,
          unit: '分',
          status: avgRating >= 4.2 ? 'green' : avgRating >= 3.8 ? 'yellow' : 'red',
          trend: 0.1,
          trendDirection: 'up',
          threshold: { yellow: 4.2, red: 3.8 },
        },
        {
          id: 'return-rate',
          name: '退货率',
          value: Math.round(returnRate * 10) / 10,
          unit: '%',
          status: returnRate < 5 ? 'green' : returnRate < 10 ? 'yellow' : 'red',
          trend: -0.3,
          trendDirection: 'down',
          threshold: { yellow: 5, red: 10 },
        },
      ];

      return NextResponse.json({
        data: { id: moduleId, name: config.name, metrics, alerts, trendData: {} },
        error: null,
      });
    }

    // 其他模块暂时返回占位数据（待后续接入真实数据源）
    const placeholderMetrics = moduleConfigs[moduleId].metrics.map(m => ({
      id: m.id,
      name: m.name,
      value: 0,
      unit: m.unit,
      status: 'green' as const,
      trend: 0,
      trendDirection: 'up' as const,
      threshold: { yellow: 0, red: 0 },
    }));

    return NextResponse.json({
      data: {
        id: moduleId,
        name: config.name,
        metrics: placeholderMetrics,
        alerts,
        trendData: {},
      },
      error: null,
    });
  } catch (error) {
    console.error(`Dashboard module error:`, error);
    return NextResponse.json(
      { data: null, error: 'Failed to fetch module data' },
      { status: 500 }
    );
  }
}
