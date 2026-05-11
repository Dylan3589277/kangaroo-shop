import type { Prisma } from '@prisma/client';
import { PRODUCT_IMAGE_PLACEHOLDER } from './products';

export const SUPPORT_ORDERS_MAX_PAGE_SIZE = 50;
export const SUPPORT_ORDER_PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'cancelled', 'refunded'] as const;
const SUPPORT_ORDER_ITEM_TITLE_FALLBACK = 'Product';

export type SupportOrderPaymentStatus = (typeof SUPPORT_ORDER_PAYMENT_STATUSES)[number];

export type SupportOrderQuery = {
  id?: string;
  orderNumber?: string;
  q?: string;
  status?: SupportOrderPaymentStatus;
  page: number;
  pageSize: number;
};

export function isSupportOrderPaymentStatus(value: string | undefined): value is SupportOrderPaymentStatus {
  return Boolean(value && SUPPORT_ORDER_PAYMENT_STATUSES.includes(value as SupportOrderPaymentStatus));
}

export type SupportOrderRecord = {
  id: string;
  orderNumber: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  originalSubtotal: number | null;
  total: number;
  courier: string;
  shippingPrefecture: string | null;
  shippingCity: string | null;
  shippingPhone: string | null;
  shippingEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
  items?: Array<{
    id: string;
    productId: string | null;
    productTitle: string;
    productImage: string | null;
    price: number;
    quantity: number;
    weight: number;
  }>;
};

export const supportOrderSelect = {
  id: true,
  orderNumber: true,
  paymentMethod: true,
  paymentStatus: true,
  subtotal: true,
  shippingFee: true,
  discountAmount: true,
  originalSubtotal: true,
  total: true,
  courier: true,
  shippingPrefecture: true,
  shippingCity: true,
  shippingPhone: true,
  shippingEmail: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      productId: true,
      productTitle: true,
      productImage: true,
      price: true,
      quantity: true,
      weight: true,
    },
  },
} satisfies Prisma.OrderSelect;

function optionalTrimmed(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseSupportOrderQuery(searchParams: URLSearchParams): SupportOrderQuery {
  const id = optionalTrimmed(searchParams.get('id'));
  const orderNumber = optionalTrimmed(searchParams.get('orderNumber'));
  const q = optionalTrimmed(searchParams.get('q'));
  const statusParam = optionalTrimmed(searchParams.get('status'));
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1);
  const requestedPageSize = parseInt(searchParams.get('pageSize') ?? '20', 10) || 20;
  const pageSize = Math.min(Math.max(requestedPageSize, 1), SUPPORT_ORDERS_MAX_PAGE_SIZE);

  const status = statusParam && statusParam !== 'all' && isSupportOrderPaymentStatus(statusParam) ? statusParam : undefined;

  return {
    id,
    orderNumber,
    q,
    status,
    page,
    pageSize,
  };
}

export function buildSupportOrderWhere(query: SupportOrderQuery): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];

  if (query.status) {
    and.push({ paymentStatus: query.status });
  }

  if (query.id) {
    and.push({ id: query.id });
  }

  if (query.orderNumber) {
    and.push({ orderNumber: query.orderNumber });
  }

  if (query.q) {
    and.push({
      OR: [
        { id: query.q },
        { orderNumber: { contains: query.q, mode: 'insensitive' } },
        { shippingEmail: { contains: query.q, mode: 'insensitive' } },
      ],
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

export function maskEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;

  const [localPart, domain] = normalized.split('@');
  if (!localPart || !domain) return null;

  const visibleLocal = localPart.slice(0, Math.min(localPart.length, 2));
  return `${visibleLocal}${'*'.repeat(Math.max(3, localPart.length - visibleLocal.length))}@${domain}`;
}

export function maskPhone(phone: string | null | undefined): string | null {
  const digits = phone?.replace(/\D/g, '') ?? '';
  if (!digits) return null;

  const lastFour = digits.slice(-4);
  return `${'*'.repeat(Math.max(4, digits.length - lastFour.length))}${lastFour}`;
}

export function toSupportOrder(order: SupportOrderRecord) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    discountAmount: order.discountAmount,
    originalSubtotal: order.originalSubtotal,
    total: order.total,
    courier: order.courier,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    maskedEmail: maskEmail(order.shippingEmail),
    maskedPhone: maskPhone(order.shippingPhone),
    addressSummary: {
      prefecture: order.shippingPrefecture,
      city: order.shippingCity,
    },
    items: (order.items ?? []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productTitle: item.productTitle.trim() || SUPPORT_ORDER_ITEM_TITLE_FALLBACK,
      productImage: item.productImage?.trim() || PRODUCT_IMAGE_PLACEHOLDER,
      price: item.price,
      quantity: item.quantity,
      weight: item.weight,
    })),
  };
}

export function supportOrderAuditSummary(query: SupportOrderQuery) {
  return {
    hasQ: Boolean(query.q),
    qLength: query.q?.length ?? 0,
    status: query.status ?? null,
    page: query.page,
    pageSize: query.pageSize,
    lookup: query.id ? 'id' : query.orderNumber ? 'orderNumber' : 'list',
  };
}

export function auditSupportOrderQuery(params: {
  adminEmail: string | null | undefined;
  action: 'support_order_list' | 'support_order_get';
  orderId?: string | null;
  orderNumber?: string | null;
  query: SupportOrderQuery;
  resultCount: number;
  timestamp?: Date;
}) {
  console.info('admin_support_order_query', {
    adminEmail: params.adminEmail ?? null,
    action: params.action,
    orderId: params.orderId ?? null,
    orderNumber: params.orderNumber ?? null,
    query: supportOrderAuditSummary(params.query),
    resultCount: params.resultCount,
    time: (params.timestamp ?? new Date()).toISOString(),
  });
}
