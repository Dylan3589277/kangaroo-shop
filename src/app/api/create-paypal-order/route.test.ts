import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST } from './route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

function requestWithBody(body?: string): NextRequest {
  return new Request('http://localhost/api/create-paypal-order', {
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

describe('POST /api/create-paypal-order request body parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it.each([
    ['empty request body', undefined],
    ['empty string request body', ''],
    ['invalid JSON request body', '{bad json'],
    ['null JSON request body', 'null'],
    ['array JSON request body', '[]'],
    ['non-object JSON request body', '"not an object"'],
  ])('rejects %s before payment order lookup', async (_label, body) => {
    const response = await POST(requestWithBody(body));

    await expectBadRequest(response, 'Invalid request body');
    expect(prisma.order.findUnique).not.toHaveBeenCalled();
    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps existing validation message for object bodies without orderId', async () => {
    const response = await POST(requestWithBody('{}'));

    await expectBadRequest(response, 'orderId is required');
    expect(prisma.order.findUnique).not.toHaveBeenCalled();
    expect(prisma.order.update).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
