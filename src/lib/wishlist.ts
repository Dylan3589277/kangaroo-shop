export const WISHLIST_SESSION_COOKIE = 'wishlist_session';

export function validateWishlistProductId(productId: unknown): productId is string {
  return typeof productId === 'string' && productId.trim().length > 0;
}
