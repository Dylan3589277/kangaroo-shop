import { describe, expect, it } from 'vitest';
import { validateWishlistProductId, WISHLIST_SESSION_COOKIE } from './wishlist';

describe('wishlist helpers', () => {
  it('keeps the public cookie name stable', () => {
    expect(WISHLIST_SESSION_COOKIE).toBe('wishlist_session');
  });

  it('accepts non-empty product ids', () => {
    expect(validateWishlistProductId('product_1')).toBe(true);
  });

  it('rejects missing, non-string, and whitespace-only product ids', () => {
    expect(validateWishlistProductId(undefined)).toBe(false);
    expect(validateWishlistProductId(null)).toBe(false);
    expect(validateWishlistProductId(123)).toBe(false);
    expect(validateWishlistProductId('')).toBe(false);
    expect(validateWishlistProductId('   ')).toBe(false);
  });
});
