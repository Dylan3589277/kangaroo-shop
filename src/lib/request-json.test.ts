import { describe, expect, it } from 'vitest';
import { parseJsonObjectText } from './request-json';

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
