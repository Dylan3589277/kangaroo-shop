import { describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { PATCH } from './route';

vi.mock('@/lib/admin-auth', () => ({
  requireAdminSession: vi.fn(async () => ({})),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    orderStatusHistory: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

function requestWithBody(body: string): NextRequest {
  return new Request('http://localhost/api/orders/order_1/status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  }) as NextRequest;
}

const context = { params: { orderId: 'order_1' } };

describe('PATCH /api/orders/[orderId]/status request body parsing', () => {
  it('rejects empty request bodies before status validation', async () => {
    const response = await PATCH(requestWithBody(''), context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Invalid request body' });
  });

  it('rejects non-object JSON request bodies before status validation', async () => {
    const response = await PATCH(requestWithBody('[]'), context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Invalid request body' });
  });

  it('keeps existing validation message for object bodies with invalid status', async () => {
    const response = await PATCH(requestWithBody('{}'), context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Invalid status' });
  });
});
