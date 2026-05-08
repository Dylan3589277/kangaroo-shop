export type ProductUrlPreviewErrorResponse = {
  error?: string;
  code?: string;
  category?: string;
  reason?: string;
  diagnostics?: {
    source?: string;
    finalUrl?: string;
    status?: number;
    contentType?: string;
    htmlBytes?: number;
    htmlTitle?: string;
    classification?: string;
    redirectCount?: number;
    attemptCount?: number;
    upstreamStatuses?: number[];
  };
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
  const diagnostics = formatDiagnostics(data.diagnostics);
  if (diagnostics) details.push(`diagnostics: ${diagnostics}`);

  return details.length ? `${message} [${details.join(' / ')}]` : message;
}

function formatDiagnostics(diagnostics: ProductUrlPreviewErrorResponse['diagnostics']): string | undefined {
  if (!diagnostics) return undefined;

  const parts = [
    stringPart('source', diagnostics.source),
    stringPart('finalUrl', diagnostics.finalUrl),
    numberPart('status', diagnostics.status),
    stringPart('contentType', diagnostics.contentType),
    numberPart('htmlBytes', diagnostics.htmlBytes),
    stringPart('htmlTitle', diagnostics.htmlTitle),
    stringPart('classification', diagnostics.classification),
    numberPart('redirectCount', diagnostics.redirectCount),
    numberPart('attemptCount', diagnostics.attemptCount),
    Array.isArray(diagnostics.upstreamStatuses) && diagnostics.upstreamStatuses.length
      ? `upstreamStatuses=${diagnostics.upstreamStatuses.join(',')}`
      : undefined,
  ].filter((value): value is string => Boolean(value));

  return parts.length ? parts.join(', ') : undefined;
}

function stringPart(label: string, value: string | undefined): string | undefined {
  return typeof value === 'string' && value.trim() ? `${label}=${value.trim()}` : undefined;
}

function numberPart(label: string, value: number | undefined): string | undefined {
  return typeof value === 'number' ? `${label}=${value}` : undefined;
}
