import { describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST } from './route';

vi.mock('@/lib/admin-auth', () => ({
  requireAdminSession: vi.fn(async () => ({})),
}));

vi.mock('@/lib/email', () => ({
  isEmailConfigured: vi.fn(() => false),
  sendOrderConfirmation: vi.fn(),
  sendStatusChangeEmail: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
    },
  },
}));

function requestWithBody(body: string): NextRequest {
  return new Request('http://localhost/api/orders/order_1/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }) as NextRequest;
}

const context = { params: { orderId: 'order_1' } };

describe('POST /api/orders/[orderId]/notify request body parsing', () => {
  it('rejects empty request bodies before notification type validation', async () => {
    const response = await POST(requestWithBody(''), context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Invalid request body' });
  });

  it('rejects invalid JSON request bodies before notification type validation', async () => {
    const response = await POST(requestWithBody('{bad json'), context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Invalid request body' });
  });

  it('keeps existing validation message for object bodies with invalid notification type', async () => {
    const response = await POST(requestWithBody('{}'), context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Invalid notification type' });
  });
});
