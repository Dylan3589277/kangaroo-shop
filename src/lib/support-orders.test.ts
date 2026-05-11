import { describe, expect, it, vi } from 'vitest';
import {
  auditSupportOrderQuery,
  maskEmail,
  maskPhone,
  parseSupportOrderQuery,
  supportOrderAuditSummary,
  toSupportOrder,
  type SupportOrderRecord,
} from './support-orders';

function makeSupportOrder(overrides: Partial<SupportOrderRecord> = {}): SupportOrderRecord {
  const now = new Date('2026-05-10T00:00:00.000Z');
  return {
    id: 'order_1',
    orderNumber: 'KS20260510001',
    paymentMethod: 'stripe',
    paymentStatus: 'paid',
    subtotal: 3000,
    shippingFee: 500,
    discountAmount: 0,
    originalSubtotal: 3000,
    total: 3500,
    courier: 'yamato',
    shippingPrefecture: 'Tokyo',
    shippingCity: 'Chiyoda',
    shippingEmail: 'Customer.Secret@example.com',
    shippingPhone: '090-1234-5678',
    createdAt: now,
    updatedAt: now,
    items: [
      {
        id: 'item_1',
        productId: 'product_1',
        productTitle: '  Test product  ',
        productImage: '  /product.jpg  ',
        price: 3000,
        quantity: 1,
        weight: 200,
      },
    ],
    ...overrides,
  };
}

describe('support order helpers', () => {
  it('masks email and phone values', () => {
    expect(maskEmail('Customer.Secret@example.com')).toBe('cu*************@example.com');
    expect(maskEmail('bad-email')).toBeNull();
    expect(maskPhone('090-1234-5678')).toBe('*******5678');
  });

  it('returns only support-safe order fields', () => {
    const supportOrder = toSupportOrder(makeSupportOrder());
    const json = JSON.stringify(supportOrder);

    expect(supportOrder).toMatchObject({
      id: 'order_1',
      orderNumber: 'KS20260510001',
      paymentStatus: 'paid',
      courier: 'yamato',
      maskedEmail: 'cu*************@example.com',
      maskedPhone: '*******5678',
      addressSummary: { prefecture: 'Tokyo', city: 'Chiyoda' },
      total: 3500,
    });
    expect(supportOrder.items[0]).toMatchObject({
      productTitle: 'Test product',
      productImage: '/product.jpg',
      quantity: 1,
    });
    expect(json).not.toContain('Customer.Secret@example.com');
    expect(json).not.toContain('090-1234-5678');
    expect(json).not.toContain('stripePaymentIntentId');
    expect(json).not.toContain('paypalOrderId');
    expect(json).not.toContain('adminNote');
  });

  it('caps page size and summarizes q without retaining raw input', () => {
    const query = parseSupportOrderQuery(new URLSearchParams({
      q: 'Customer.Secret@example.com',
      status: 'paid',
      page: '2',
      pageSize: '500',
    }));

    expect(query.pageSize).toBe(50);
    expect(supportOrderAuditSummary(query)).toEqual({
      hasQ: true,
      qLength: 'Customer.Secret@example.com'.length,
      status: 'paid',
      page: 2,
      pageSize: 50,
      lookup: 'list',
    });
  });

  it('ignores unsupported payment status filters', () => {
    const query = parseSupportOrderQuery(new URLSearchParams({
      status: 'paid OR 1=1',
    }));

    expect(query.status).toBeUndefined();
    expect(supportOrderAuditSummary(query).status).toBeNull();
  });

  it('writes structured audit logs without raw search PII', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const query = parseSupportOrderQuery(new URLSearchParams({
      q: 'Customer.Secret@example.com',
      status: 'paid',
    }));

    auditSupportOrderQuery({
      adminEmail: 'admin@example.com',
      action: 'support_order_list',
      query,
      resultCount: 1,
      timestamp: new Date('2026-05-10T01:02:03.000Z'),
    });

    expect(infoSpy).toHaveBeenCalledWith('admin_support_order_query', {
      adminEmail: 'admin@example.com',
      action: 'support_order_list',
      orderId: null,
      orderNumber: null,
      query: {
        hasQ: true,
        qLength: 'Customer.Secret@example.com'.length,
        status: 'paid',
        page: 1,
        pageSize: 20,
        lookup: 'list',
      },
      resultCount: 1,
      time: '2026-05-10T01:02:03.000Z',
    });
    expect(JSON.stringify(infoSpy.mock.calls)).not.toContain('Customer.Secret@example.com');

    infoSpy.mockRestore();
  });
});
