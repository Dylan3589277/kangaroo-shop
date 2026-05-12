import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { POST } from './route';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    promotion: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

function requestWithBody(body: string): NextRequest {
  return new Request('http://localhost/api/promotions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }) as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/promotions request body parsing', () => {
  it('rejects empty request bodies before validation', async () => {
    const response = await POST(requestWithBody(''));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Invalid request body' });
  });

  it('rejects invalid JSON request bodies before validation', async () => {
    const response = await POST(requestWithBody('{bad json'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Invalid request body' });
  });

  it('keeps existing validation message for object bodies missing required fields', async () => {
    const response = await POST(requestWithBody('{}'));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'code and subtotal are required' });
  });

  it('formats minimum order amount as a JPY integer without cent conversion', async () => {
    vi.mocked(prisma.promotion.findUnique).mockResolvedValueOnce({
      id: 'promo_1',
      code: 'SAVE',
      name: 'Save',
      description: null,
      type: 'fixed_discount',
      value: 500,
      maxDiscountAmount: null,
      minOrderAmount: 3000,
      usageLimit: null,
      usedCount: 0,
      perUserLimit: 1,
      applicableProducts: [],
      applicableCategories: [],
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T00:00:00.000Z'),
      isActive: true,
      isPublic: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const response = await POST(
      requestWithBody(JSON.stringify({ code: 'SAVE', subtotal: 1000 }))
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      valid: false,
      error: '订单金额需满 ¥3000 才能使用此优惠券',
    });
  });
});
