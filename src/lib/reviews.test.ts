import { describe, expect, it } from 'vitest';
import { normalizeReviewPagination, validateReviewInput } from './reviews';

describe('normalizeReviewPagination', () => {
  it('uses default pagination when params are missing', () => {
    expect(normalizeReviewPagination(null, null)).toEqual({ page: 1, limit: 10 });
  });

  it('falls back to defaults for invalid values', () => {
    expect(normalizeReviewPagination('abc', 'def')).toEqual({ page: 1, limit: 10 });
  });

  it('enforces minimum values', () => {
    expect(normalizeReviewPagination('0', '0')).toEqual({ page: 1, limit: 10 });
    expect(normalizeReviewPagination('-1', '-5')).toEqual({ page: 1, limit: 10 });
  });

  it('caps limit at 50', () => {
    expect(normalizeReviewPagination('2', '100')).toEqual({ page: 2, limit: 50 });
  });

  it('keeps valid integer values', () => {
    expect(normalizeReviewPagination('3', '25')).toEqual({ page: 3, limit: 25 });
  });
});

describe('validateReviewInput', () => {
  it('trims valid review input', () => {
    const result = validateReviewInput({
      authorName: '  Alice  ',
      rating: '5',
      title: '  Great product  ',
      content: '  Very useful  ',
    });

    expect(result).toEqual({
      success: true,
      data: {
        authorName: 'Alice',
        rating: 5,
        title: 'Great product',
        content: 'Very useful',
      },
    });
  });

  it('converts blank title to null', () => {
    const result = validateReviewInput({
      authorName: 'Alice',
      rating: 4,
      title: '   ',
      content: 'Nice',
    });

    expect(result).toEqual({
      success: true,
      data: {
        authorName: 'Alice',
        rating: 4,
        title: null,
        content: 'Nice',
      },
    });
  });

  it('rejects missing required fields', () => {
    expect(validateReviewInput({ rating: 5, content: 'Nice' })).toEqual({
      success: false,
      error: 'Missing required fields',
    });
    expect(validateReviewInput({ authorName: 'Alice', rating: 5 })).toEqual({
      success: false,
      error: 'Missing required fields',
    });
    expect(validateReviewInput({ authorName: 'Alice', content: 'Nice' })).toEqual({
      success: false,
      error: 'Missing required fields',
    });
  });

  it('rejects blank authorName and content', () => {
    expect(validateReviewInput({ authorName: '   ', rating: 5, content: 'Nice' })).toEqual({
      success: false,
      error: 'Missing required fields',
    });
    expect(validateReviewInput({ authorName: 'Alice', rating: 5, content: '   ' })).toEqual({
      success: false,
      error: 'Missing required fields',
    });
  });

  it.each([
    0,
    '0',
    6,
    '6',
    1.5,
    '1.5',
    Number.NaN,
    'abc',
  ])('rejects invalid rating %s', (rating) => {
    expect(validateReviewInput({ authorName: 'Alice', rating, content: 'Nice' })).toEqual({
      success: false,
      error: 'Rating must be 1-5',
    });
  });
});
