import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { GET } from './route';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin-auth';

vi.mock('@/lib/admin-auth', () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

function request(url: string): NextRequest {
  return new Request(url) as NextRequest;
}

const orderRecord = {
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
  shippingEmail: 'customer.secret@example.com',
  shippingPhone: '090-1234-5678',
  createdAt: new Date('2026-05-10T00:00:00.000Z'),
  updatedAt: new Date('2026-05-10T00:00:00.000Z'),
  items: [
    {
      id: 'item_1',
      productId: 'product_1',
      productTitle: 'Test product',
      productImage: '/product.jpg',
      price: 3000,
      quantity: 1,
      weight: 200,
    },
  ],
};

describe('GET /api/admin/support/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminSession).mockResolvedValue({
      response: null,
      session: { user: { email: 'admin@example.com', role: 'admin' } },
    });
  });

  it('returns 401 for missing admin session', async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce({
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      session: null,
    });

    const response = await GET(request('http://localhost/api/admin/support/orders'));

    expect(response.status).toBe(401);
    expect(prisma.order.findMany).not.toHaveBeenCalled();
  });

  it('returns 403 for non-admin sessions', async () => {
    vi.mocked(requireAdminSession).mockResolvedValueOnce({
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      session: { user: { email: 'user@example.com', role: 'user' } },
    });

    const response = await GET(request('http://localhost/api/admin/support/orders'));

    expect(response.status).toBe(403);
    expect(prisma.order.findMany).not.toHaveBeenCalled();
  });

  it('returns masked admin query results and caps page size', async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValueOnce([orderRecord] as never);
    vi.mocked(prisma.order.count).mockResolvedValueOnce(1 as never);
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const response = await GET(request('http://localhost/api/admin/support/orders?q=customer.secret%40example.com&status=paid&page=1&pageSize=500'));
    const body = await response.json();
    const json = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.orders).toHaveLength(1);
    expect(body.orders[0]).toMatchObject({
      id: 'order_1',
      orderNumber: 'KS20260510001',
      paymentStatus: 'paid',
      maskedEmail: 'cu*************@example.com',
      maskedPhone: '*******5678',
      addressSummary: { prefecture: 'Tokyo', city: 'Chiyoda' },
      total: 3500,
    });
    expect(body.pagination).toEqual({ page: 1, pageSize: 50, total: 1, totalPages: 1 });
    expect(json).not.toContain('customer.secret@example.com');
    expect(json).not.toContain('090-1234-5678');
    expect(json).not.toContain('shippingEmail');
    expect(json).not.toContain('shippingPhone');
    expect(json).not.toContain('stripePaymentIntentId');
    expect(json).not.toContain('paypalOrderId');
    expect(json).not.toContain('adminNote');
    expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 50,
      select: expect.not.objectContaining({
        shippingAddress1: true,
        shippingAddress2: true,
        stripePaymentIntentId: true,
        paypalOrderId: true,
        adminNote: true,
      }),
    }));
    expect(JSON.stringify(infoSpy.mock.calls)).not.toContain('customer.secret@example.com');
    expect(JSON.stringify(infoSpy.mock.calls)).not.toContain('090-1234-5678');

    infoSpy.mockRestore();
  });

  it('ignores unsupported payment status filters before building database query', async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValueOnce([] as never);
    vi.mocked(prisma.order.count).mockResolvedValueOnce(0 as never);
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const response = await GET(request('http://localhost/api/admin/support/orders?status=paid%20OR%201%3D1'));

    expect(response.status).toBe(200);
    expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {},
    }));
    expect(infoSpy).toHaveBeenCalledWith('admin_support_order_query', expect.objectContaining({
      query: expect.objectContaining({ status: null }),
    }));

    infoSpy.mockRestore();
  });

  it('supports single orderNumber lookup with masked response and structured audit fields', async () => {
    vi.mocked(prisma.order.findFirst).mockResolvedValueOnce(orderRecord as never);
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const response = await GET(request('http://localhost/api/admin/support/orders?orderNumber=KS20260510001'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.order.orderNumber).toBe('KS20260510001');
    expect(body.order.maskedEmail).toBe('cu*************@example.com');
    expect(infoSpy).toHaveBeenCalledWith('admin_support_order_query', expect.objectContaining({
      adminEmail: 'admin@example.com',
      action: 'support_order_get',
      orderId: 'order_1',
      orderNumber: 'KS20260510001',
      resultCount: 1,
    }));

    infoSpy.mockRestore();
  });
});
