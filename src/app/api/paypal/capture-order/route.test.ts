import { describe, expect, it } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST } from './route';

function jsonRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/paypal/capture-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest;
}

function textRequest(body: string): NextRequest {
  return new Request('http://localhost/api/paypal/capture-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }) as NextRequest;
}

describe('POST /api/paypal/capture-order', () => {
  it('rejects empty JSON instead of treating it as PayPal cancellation', async () => {
    const response = await POST(jsonRequest({}));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'orderId and paypalOrderId are required' });
  });

  it('rejects invalid or empty request bodies', async () => {
    const response = await POST(textRequest(''));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Invalid request body' });
  });
});
