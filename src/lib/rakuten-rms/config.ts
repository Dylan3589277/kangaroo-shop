/**
 * Rakuten RMS Web Service — server-side configuration loader.
 *
 * Security invariants:
 *  - Only reads from server-side env vars (never NEXT_PUBLIC_*).
 *  - Never returns raw secrets; all callers receive the masked summary.
 *  - Authorization header is built only inside client.ts, in memory, per request.
 *  - RAKUTEN_RMS_READ_ONLY must be exactly "true" for the client to operate.
 */

import {
  RakutenRmsConfig,
  RakutenRmsConfigError,
  RakutenRmsConfigSummary,
  RakutenRmsStatus,
} from './types';

const DEFAULT_BASE_URL = 'https://api.rms.rakuten.co.jp/es/1.0';

/**
 * Mask a secret string so it is safe to log or display.
 * Shows the first 2 and last 2 characters; everything else is replaced with *.
 * A very short string is fully masked.
 */
function maskSecret(value: string): string {
  if (value.length <= 4) return '***';
  return `****${value.slice(-4)}`;
}

function normalizeBaseUrl(rawBaseUrl?: string): string {
  const baseUrl = rawBaseUrl?.replace(/\/$/, '') ?? DEFAULT_BASE_URL;

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new RakutenRmsConfigError('RAKUTEN_RMS_BASE_URL is not a valid URL.');
  }

  if (parsed.protocol !== 'https:') {
    throw new RakutenRmsConfigError('RAKUTEN_RMS_BASE_URL must use https.');
  }

  if (
    parsed.hostname !== 'rms.rakuten.co.jp' &&
    !parsed.hostname.endsWith('.rms.rakuten.co.jp')
  ) {
    throw new RakutenRmsConfigError(
      'RAKUTEN_RMS_BASE_URL must point to a Rakuten RMS host.'
    );
  }

  return baseUrl;
}

/**
 * Load Rakuten RMS config from environment variables.
 * Throws {@link RakutenRmsConfigError} if required vars are absent or if the
 * read-only guard is not enabled.
 *
 * @internal — callers should use {@link getConfigSummary} or
 * {@link buildAuthorizationHeader} instead of this function directly.
 */
export function loadRakutenRmsConfig(): RakutenRmsConfig {
  const serviceSecret = process.env.RAKUTEN_SERVICE_SECRET;
  const licenseKey = process.env.RAKUTEN_LICENSE_KEY;

  if (!serviceSecret) {
    throw new RakutenRmsConfigError(
      'RAKUTEN_SERVICE_SECRET is not set. Add it to your server-side environment variables.'
    );
  }
  if (!licenseKey) {
    throw new RakutenRmsConfigError(
      'RAKUTEN_LICENSE_KEY is not set. Add it to your server-side environment variables.'
    );
  }

  const readOnly = process.env.RAKUTEN_RMS_READ_ONLY === 'true';
  if (!readOnly) {
    throw new RakutenRmsConfigError(
      'RAKUTEN_RMS_READ_ONLY is not set to "true". ' +
        'This integration only allows read-only access. ' +
        'Set RAKUTEN_RMS_READ_ONLY=true to enable it.'
    );
  }

  const baseUrl = normalizeBaseUrl(process.env.RAKUTEN_RMS_BASE_URL);

  return { serviceSecret, licenseKey, baseUrl, readOnly };
}

/**
 * Returns a masked configuration summary safe to include in logs or API responses.
 * Secrets are never present in the returned object.
 */
export function getConfigSummary(): RakutenRmsConfigSummary {
  const config = loadRakutenRmsConfig();
  return {
    configured: true,
    baseUrl: config.baseUrl,
    readOnly: config.readOnly,
    serviceSecretMasked: maskSecret(config.serviceSecret),
    licenseKeyMasked: maskSecret(config.licenseKey),
  };
}

/**
 * Returns the configuration status without throwing.
 * Use this for health checks or diagnostics.
 */
export function getRakutenRmsStatus(): RakutenRmsStatus {
  try {
    return getConfigSummary();
  } catch {
    return {
      configured: false,
      reason: 'Rakuten RMS is not configured.',
    };
  }
}

/**
 * Returns true only when all required env vars are present and read-only guard
 * is enabled. Does not throw.
 */
export function isRakutenRmsConfigured(): boolean {
  const status = getRakutenRmsStatus();
  return status.configured;
}

/**
 * Build the ESA Authorization header value in memory.
 * The returned string must NOT be logged, stored, or returned to the client.
 *
 * @internal — used exclusively by client.ts
 */
export function buildAuthorizationHeader(): string {
  const { serviceSecret, licenseKey } = loadRakutenRmsConfig();
  const token = Buffer.from(`${serviceSecret}:${licenseKey}`).toString('base64');
  // The raw token is only ever held in this local variable and in the returned string.
  return `ESA ${token}`;
}
