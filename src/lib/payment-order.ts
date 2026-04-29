import { prisma } from '@/lib/prisma';

type PaymentOrder = {
  id: string;
  orderNumber: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
};

export class PaymentOrderError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'PaymentOrderError';
    this.status = status;
  }
}

const DISALLOWED_PAYMENT_STATUSES = new Set(['paid', 'cancelled', 'refunded']);

export async function getPayableOrder(orderId: unknown): Promise<PaymentOrder> {
  if (typeof orderId !== 'string' || !orderId.trim()) {
    throw new PaymentOrderError('orderId is required', 400);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId.trim() },
    select: {
      id: true,
      orderNumber: true,
      paymentMethod: true,
      paymentStatus: true,
      total: true,
    },
  });

  if (!order) {
    throw new PaymentOrderError('Order not found', 404);
  }

  if (DISALLOWED_PAYMENT_STATUSES.has(order.paymentStatus)) {
    throw new PaymentOrderError(`Order payment status is not payable: ${order.paymentStatus}`, 400);
  }

  if (!Number.isInteger(order.total) || order.total <= 0) {
    throw new PaymentOrderError('Order total is invalid', 400);
  }

  return order;
}
