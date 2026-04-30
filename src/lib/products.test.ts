import { describe, expect, it } from 'vitest';
import { getProductImageUrl, parseProductImages, PRODUCT_IMAGE_PLACEHOLDER } from './products';

describe('product image helpers', () => {
  it('parses image arrays from JSON strings', () => {
    expect(parseProductImages('["/a.jpg","/b.jpg"]')).toEqual(['/a.jpg', '/b.jpg']);
  });

  it('falls back to a single string when JSON parsing fails', () => {
    expect(parseProductImages('/single.jpg')).toEqual(['/single.jpg']);
  });

  it('filters non-string values and empty strings', () => {
    expect(parseProductImages('["/a.jpg", 123, "", null, "/b.jpg"]')).toEqual(['/a.jpg', '/b.jpg']);
  });

  it('trims image URLs and removes whitespace-only entries', () => {
    expect(parseProductImages('[" /a.jpg ", "   ", " /b.jpg"]')).toEqual(['/a.jpg', '/b.jpg']);
  });

  it('uses first parsed image', () => {
    expect(getProductImageUrl('["/first.jpg","/second.jpg"]')).toBe('/first.jpg');
  });

  it('returns default placeholder when no product image is available', () => {
    expect(getProductImageUrl('[]')).toBe(PRODUCT_IMAGE_PLACEHOLDER);
  });

  it('supports caller-provided fallback', () => {
    expect(getProductImageUrl(null, '/placeholder-product.png')).toBe('/placeholder-product.png');
  });
});
