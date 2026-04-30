import { describe, expect, it } from 'vitest';
import { parseJsonObjectText, parseRequestJsonObject } from './request-json';

function makeRequest(body: string): Parameters<typeof parseRequestJsonObject>[0] {
  return { text: async () => body } as Parameters<typeof parseRequestJsonObject>[0];
}

describe('parseJsonObjectText', () => {
  it('accepts valid JSON objects', () => {
    expect(parseJsonObjectText('{"productId":"p1","quantity":2}')).toEqual({
      success: true,
      data: { productId: 'p1', quantity: 2 },
    });
  });

  it('rejects empty strings and empty body text', () => {
    expect(parseJsonObjectText('')).toEqual({
      success: false,
      error: 'Invalid request body',
    });
    expect(parseJsonObjectText('   ')).toEqual({
      success: false,
      error: 'Invalid request body',
    });
  });

  it('rejects invalid JSON', () => {
    expect(parseJsonObjectText('{bad json')).toEqual({
      success: false,
      error: 'Invalid request body',
    });
  });

  it('rejects null body', () => {
    expect(parseJsonObjectText('null')).toEqual({
      success: false,
      error: 'Invalid request body',
    });
  });

  it.each(['[]', '"text"', '123', 'true'])('rejects non-object JSON body %s', (body) => {
    expect(parseJsonObjectText(body)).toEqual({
      success: false,
      error: 'Invalid request body',
    });
  });

  it('supports a caller-provided error message', () => {
    expect(parseJsonObjectText('', 'Invalid JSON body')).toEqual({
      success: false,
      error: 'Invalid JSON body',
    });
  });
});

describe('parseRequestJsonObject', () => {
  it('returns parsed data for a valid JSON object body', async () => {
    const result = await parseRequestJsonObject(makeRequest('{"title":"T-shirt","price":1200}'));
    expect(result).toEqual({ success: true, data: { title: 'T-shirt', price: 1200 } });
  });

  it('returns 400 response for empty body', async () => {
    const result = await parseRequestJsonObject(makeRequest(''));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json() as { error: string };
      expect(body.error).toBe('Invalid request body');
    }
  });

  it('returns 400 response for null body', async () => {
    const result = await parseRequestJsonObject(makeRequest('null'));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.response.status).toBe(400);
  });

  it('returns 400 response for a JSON array body', async () => {
    const result = await parseRequestJsonObject(makeRequest('[1,2,3]'));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.response.status).toBe(400);
  });

  it('returns 400 response for malformed JSON', async () => {
    const result = await parseRequestJsonObject(makeRequest('{bad json'));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.response.status).toBe(400);
  });
});
