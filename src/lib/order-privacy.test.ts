import { describe, expect, it } from 'vitest';
import type { Order, OrderItem } from '@prisma/client';
import { PRODUCT_IMAGE_PLACEHOLDER } from './products';
import { isAdminSession, toPublicOrder } from './order-privacy';

function makeOrder(overrides: Partial<Order> = {}, items: OrderItem[] = []) {
  const now = new Date('2026-04-30T00:00:00.000Z');
  return {
    id: 'order_1',
    orderNumber: 'KS-0001',
    userId: 'user_1',
    status: 'pending',
    paymentMethod: 'stripe',
    paymentStatus: 'pending',
    subtotal: 1000,
    shippingFee: 200,
    total: 1200,
    courier: 'yamato',
    shippingName: 'Customer Name',
    shippingPostal: '100-0001',
    shippingPrefecture: 'Tokyo',
    shippingCity: 'Chiyoda',
    shippingAddress1: '1-1-1',
    shippingAddress2: 'Room 101',
    shippingPhone: '090-0000-0000',
    shippingEmail: 'customer@example.com',
    notes: 'customer note',
    stripePaymentIntentId: 'pi_secret',
    paypalOrderId: 'paypal_secret',
    createdAt: now,
    updatedAt: now,
    ...overrides,
    items,
  } as Order & { items: OrderItem[] };
}

function makeItem(overrides: Partial<OrderItem> = {}) {
  const now = new Date('2026-04-30T00:00:00.000Z');
  return {
    id: 'item_1',
    orderId: 'order_1',
    productId: 'product_1',
    productTitle: '  Product title  ',
    productImage: '  /product.jpg  ',
    price: 1000,
    quantity: 1,
    weight: 200,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as OrderItem;
}

describe('order privacy helpers', () => {
  it('removes customer PII and internal payment identifiers from public view', () => {
    const publicOrder = toPublicOrder(makeOrder({}, [makeItem()]));

    expect(publicOrder.shippingName).toBeNull();
    expect(publicOrder.shippingPostal).toBeNull();
    expect(publicOrder.shippingPrefecture).toBeNull();
    expect(publicOrder.shippingCity).toBeNull();
    expect(publicOrder.shippingAddress1).toBeNull();
    expect(publicOrder.shippingAddress2).toBeNull();
    expect(publicOrder.shippingPhone).toBeNull();
    expect(publicOrder.shippingEmail).toBeNull();
    expect(publicOrder).not.toHaveProperty('stripePaymentIntentId');
    expect(publicOrder).not.toHaveProperty('paypalOrderId');
    expect(publicOrder).not.toHaveProperty('adminNote');
    expect(publicOrder).not.toHaveProperty('history');
  });

  it('keeps public order item fields and applies safe text/image fallback', () => {
    const publicOrder = toPublicOrder(makeOrder({}, [
      makeItem({ productTitle: '   ', productImage: '   ' }),
    ]));

    expect(publicOrder.items).toEqual([
      {
        id: 'item_1',
        productId: 'product_1',
        productTitle: 'Product',
        productImage: PRODUCT_IMAGE_PLACEHOLDER,
        price: 1000,
        quantity: 1,
        weight: 200,
      },
    ]);
  });

  it('detects admin sessions without treating missing sessions as admin', () => {
    expect(isAdminSession({ user: { role: 'admin' } })).toBe(true);
    expect(isAdminSession({ user: { role: 'user' } })).toBe(false);
    expect(isAdminSession(null)).toBe(false);
  });
});
