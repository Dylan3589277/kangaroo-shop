import { describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
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
});
