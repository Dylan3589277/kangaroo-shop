import { prisma } from '@/lib/prisma';

// Alert categories
export interface AlertCandidate {
  metricId: string;
  metricName: string;
  module: 'hr' | 'finance' | 'supply_chain' | 'operation' | 'influencer';
  status: 'green' | 'yellow' | 'red';
  threshold: number;
  currentValue: number;
  assignee?: string;
}

/**
 * Check for refund/failed payment orders and generate alerts
 */
export async function checkOrderAlerts(): Promise<AlertCandidate[]> {
  const alerts: AlertCandidate[] = [];

  // Find recent failed payment orders (last 24 hours)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const failedOrders = await prisma.order.findMany({
    where: {
      paymentStatus: { in: ['failed', 'cancelled'] },
      createdAt: { gte: twentyFourHoursAgo },
    },
  });

  if (failedOrders.length > 0) {
    alerts.push({
      metricId: 'payment-failures',
      metricName: `最近24小时支付失败订单 (${failedOrders.length}笔)`,
      module: 'operation',
      status: failedOrders.length >= 5 ? 'red' : failedOrders.length >= 2 ? 'yellow' : 'yellow',
      threshold: 1,
      currentValue: failedOrders.length,
      assignee: '运营',
    });
  }

  // Find recent refunded orders (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const refundedOrders = await prisma.order.findMany({
    where: {
      paymentStatus: 'refunded',
      createdAt: { gte: sevenDaysAgo },
    },
  });

  if (refundedOrders.length >= 3) {
    alerts.push({
      metricId: 'refund-surge',
      metricName: `近7天退款订单 (${refundedOrders.length}笔)`,
      module: 'finance',
      status: refundedOrders.length >= 10 ? 'red' : 'yellow',
      threshold: 2,
      currentValue: refundedOrders.length,
      assignee: '客服',
    });
  }

  return alerts;
}

/**
 * Check for low stock products and generate alerts
 */
export async function checkStockAlerts(): Promise<AlertCandidate[]> {
  const LOW_STOCK_THRESHOLD = 5;

  const lowStockProducts = await prisma.product.findMany({
    where: {
      isActive: true,
      stock: { lte: LOW_STOCK_THRESHOLD },
    },
    select: {
      id: true,
      title: true,
      stock: true,
    },
    orderBy: { stock: 'asc' },
  });

  if (lowStockProducts.length === 0) return [];

  const outOfStock = lowStockProducts.filter((p) => p.stock === 0);
  const lowStock = lowStockProducts.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD);

  const alerts: AlertCandidate[] = [];

  if (outOfStock.length > 0) {
    alerts.push({
      metricId: 'out-of-stock',
      metricName: `缺货商品 (${outOfStock.length}件)`,
      module: 'supply_chain',
      status: outOfStock.length >= 5 ? 'red' : 'yellow',
      threshold: 1,
      currentValue: outOfStock.length,
      assignee: '供应链',
    });
  }

  if (lowStock.length > 0) {
    alerts.push({
      metricId: 'low-stock',
      metricName: `库存不足商品 (${lowStock.length}件)`,
      module: 'supply_chain',
      status: lowStock.length >= 10 ? 'yellow' : 'yellow',
      threshold: LOW_STOCK_THRESHOLD,
      currentValue: lowStock.length,
      assignee: '供应链',
    });
  }

  return alerts;
}

/**
 * Check for low-rated products and generate alerts
 */
export async function checkReviewAlerts(): Promise<AlertCandidate[]> {
  const lowRatedProducts = await prisma.review.findMany({
    where: {
      rating: { lt: 3 },
      isApproved: true,
      product: { isActive: true },
    },
    include: {
      product: {
        select: { id: true, title: true, isActive: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (lowRatedProducts.length === 0) return [];

  // Group by product to count low reviews per product
  const productLowReviewMap = new Map<string, { title: string; count: number }>();
  for (const review of lowRatedProducts) {
    if (!review.product) continue;
    const existing = productLowReviewMap.get(review.product.id);
    if (existing) {
      existing.count++;
    } else {
      productLowReviewMap.set(review.product.id, {
        title: review.product.title,
        count: 1,
      });
    }
  }

  const alerts: AlertCandidate[] = [];
  const totalLowReviewProducts = productLowReviewMap.size;

  if (totalLowReviewProducts > 0) {
    alerts.push({
      metricId: 'low-rated-products',
      metricName: `低评分商品 (${totalLowReviewProducts}件收到3星以下评价)`,
      module: 'operation',
      status: totalLowReviewProducts >= 5 ? 'red' : totalLowReviewProducts >= 2 ? 'yellow' : 'yellow',
      threshold: 1,
      currentValue: totalLowReviewProducts,
      assignee: '运营',
    });
  }

  return alerts;
}

/**
 * Check all alert sources and generate/update alerts in DB
 * Returns the count of active unresolved alerts
 */
export async function refreshDashboardAlerts(): Promise<void> {
  const allCandidates: AlertCandidate[] = [
    ...(await checkOrderAlerts()),
    ...(await checkStockAlerts()),
    ...(await checkReviewAlerts()),
  ];

  // Get existing unresolved alerts
  const existingAlerts = await prisma.dashboardAlert.findMany({
    where: { resolvedAt: null },
  });

  const existingMetricIds = new Set(existingAlerts.map((a) => a.metricId));

  // Create new alerts for candidates that don't already exist
  for (const candidate of allCandidates) {
    if (!existingMetricIds.has(candidate.metricId)) {
      await prisma.dashboardAlert.create({
        data: {
          metricId: candidate.metricId,
          metricName: candidate.metricName,
          module: candidate.module,
          status: candidate.status,
          threshold: candidate.threshold,
          currentValue: candidate.currentValue,
          assignee: candidate.assignee || null,
        },
      });
    } else {
      // Update existing alert's current value and status
      await prisma.dashboardAlert.updateMany({
        where: { metricId: candidate.metricId, resolvedAt: null },
        data: {
          currentValue: candidate.currentValue,
          status: candidate.status,
          metricName: candidate.metricName,
        },
      });
    }
  }

  // Resolve alerts for candidates that no longer trigger
  const candidateMetricIds = new Set(allCandidates.map((c) => c.metricId));
  for (const existing of existingAlerts) {
    if (!candidateMetricIds.has(existing.metricId)) {
      // Check if it's an auto-generated alert (our specific metric IDs)
      const isAutoAlert = [
        'payment-failures',
        'refund-surge',
        'out-of-stock',
        'low-stock',
        'low-rated-products',
      ].includes(existing.metricId);

      if (isAutoAlert) {
        await prisma.dashboardAlert.update({
          where: { id: existing.id },
          data: {
            resolvedAt: new Date(),
            status: 'green',
            handlingResult: '自动解决: 条件已恢复正常',
            handler: '系统',
          },
        });
      }
    }
  }
}
