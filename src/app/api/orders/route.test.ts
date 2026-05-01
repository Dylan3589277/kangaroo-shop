import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/prisma';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    promotion: {
      findUnique: vi.fn(),
    },
  },
}));

function requestWithBody(body?: string): NextRequest {
  return new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }) as NextRequest;
}

async function expectBadRequest(response: Response, error: string) {
  const body = await response.json();

  expect(response.status).toBe(400);
  expect(body).toEqual({ error });
}

describe('POST /api/orders request body parsing and validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['empty request body', undefined],
    ['empty string request body', ''],
    ['invalid JSON request body', '{bad json'],
    ['null JSON request body', 'null'],
    ['array JSON request body', '[]'],
    ['non-object JSON request body', '"not an object"'],
  ])('rejects %s before order validation', async (_label, body) => {
    const response = await POST(requestWithBody(body));

    await expectBadRequest(response, 'Invalid request body');
    expect(prisma.product.findMany).not.toHaveBeenCalled();
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('keeps existing validation message for object bodies with invalid payment method', async () => {
    const response = await POST(requestWithBody('{}'));

    await expectBadRequest(response, 'Invalid payment method');
    expect(prisma.product.findMany).not.toHaveBeenCalled();
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('keeps existing validation message for empty carts', async () => {
    const response = await POST(requestWithBody(JSON.stringify({ paymentMethod: 'stripe', items: [] })));

    await expectBadRequest(response, 'Cart is empty');
    expect(prisma.product.findMany).not.toHaveBeenCalled();
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it.each([
    ['item object without product id', [{ quantity: 1 }]],
    ['null item', [null]],
    ['string item', ['prod_1']],
  ])('keeps existing validation message for %s', async (_label, items) => {
    const response = await POST(requestWithBody(JSON.stringify({
      paymentMethod: 'stripe',
      items,
    })));

    await expectBadRequest(response, 'Product id is required');
    expect(prisma.product.findMany).not.toHaveBeenCalled();
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('keeps existing validation message for invalid quantities', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValueOnce([
      { id: 'prod_1', title: 'Test product', images: '[]', price: 1200, weight: 200 },
    ] as never);

    const response = await POST(requestWithBody(JSON.stringify({
      paymentMethod: 'stripe',
      items: [{ productId: 'prod_1', quantity: 0 }],
    })));

    await expectBadRequest(response, 'Invalid quantity');
    expect(prisma.order.create).not.toHaveBeenCalled();
  });
});
