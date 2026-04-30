import type { Order, OrderItem } from '@prisma/client';
import { PRODUCT_IMAGE_PLACEHOLDER } from './products';

type OrderWithItems = Order & { items?: OrderItem[] };

const PUBLIC_PRODUCT_TITLE_FALLBACK = 'Product';

/**
 * Public order view for checkout/payment success pages.
 *
 * Intentionally excludes PII and internal/payment provider identifiers:
 * - shippingEmail / shippingPhone / full shipping address
 * - adminNote / history
 * - stripePaymentIntentId / paypalOrderId
 */
export function toPublicOrder(order: OrderWithItems) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotal: order.subtotal,
    shippingFee: order.shippingFee,
    total: order.total,
    courier: order.courier,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    // Keep legacy shape for checkout pages, but do not expose recipient PII/address.
    shippingName: null,
    shippingPostal: null,
    shippingPrefecture: null,
    shippingCity: null,
    shippingAddress1: null,
    shippingAddress2: null,
    shippingPhone: null,
    shippingEmail: null,
    items: (order.items ?? []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productTitle: item.productTitle.trim() || PUBLIC_PRODUCT_TITLE_FALLBACK,
      productImage: item.productImage?.trim() || PRODUCT_IMAGE_PLACEHOLDER,
      price: item.price,
      quantity: item.quantity,
      weight: item.weight,
    })),
  };
}

export function isAdminSession(session: { user?: { role?: string | null } } | null): boolean {
  return session?.user?.role === 'admin';
}
