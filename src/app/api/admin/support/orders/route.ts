import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { serverError } from '@/lib/api-error';
import { prisma } from '@/lib/prisma';
import {
  auditSupportOrderQuery,
  buildSupportOrderWhere,
  parseSupportOrderQuery,
  supportOrderSelect,
  toSupportOrder,
  type SupportOrderRecord,
} from '@/lib/support-orders';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { session, response } = await requireAdminSession();
    if (response) return response;

    const query = parseSupportOrderQuery(new URL(req.url).searchParams);
    const where = buildSupportOrderWhere(query);
    const isSingleLookup = Boolean(query.id || query.orderNumber);

    if (isSingleLookup) {
      const order = await prisma.order.findFirst({
        where,
        select: supportOrderSelect,
      });

      auditSupportOrderQuery({
        adminEmail: session?.user?.email,
        action: 'support_order_get',
        orderId: order?.id ?? query.id ?? null,
        orderNumber: order?.orderNumber ?? query.orderNumber ?? null,
        query,
        resultCount: order ? 1 : 0,
      });

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      return NextResponse.json({ order: toSupportOrder(order as SupportOrderRecord) });
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: supportOrderSelect,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    auditSupportOrderQuery({
      adminEmail: session?.user?.email,
      action: 'support_order_list',
      query,
      resultCount: orders.length,
    });

    return NextResponse.json({
      orders: (orders as SupportOrderRecord[]).map(toSupportOrder),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
