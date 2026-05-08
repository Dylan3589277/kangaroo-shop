export type ProductUrlPreviewErrorResponse = {
  error?: string;
  code?: string;
  category?: string;
  reason?: string;
};

export function formatProductUrlPreviewError(
  data: ProductUrlPreviewErrorResponse,
  fallback: string
): string {
  const message = typeof data.error === 'string' && data.error.trim()
    ? data.error.trim()
    : fallback;
  const details = [data.code, data.category, data.reason]
    .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    .map(value => value.trim());

  return details.length ? `${message} [${details.join(' / ')}]` : message;
}
