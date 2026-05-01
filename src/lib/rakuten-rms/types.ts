/**
 * Rakuten RMS Web Service — type definitions.
 * Read-only integration: only GET requests are permitted.
 */

/** Raw (unmasked) internal config — never expose outside this module. */
export interface RakutenRmsConfig {
  serviceSecret: string;
  licenseKey: string;
  baseUrl: string;
  readOnly: boolean;
}

/** Safe summary returned to callers — secrets are masked. */
export interface RakutenRmsConfigSummary {
  configured: true;
  baseUrl: string;
  readOnly: boolean;
  serviceSecretMasked: string;
  licenseKeyMasked: string;
}

/** Status when env vars are absent. */
export interface RakutenRmsUnconfigured {
  configured: false;
  reason: string;
}

export type RakutenRmsStatus = RakutenRmsConfigSummary | RakutenRmsUnconfigured;

export interface RakutenRmsRequestOptions {
  /** Query-string parameters. */
  params?: Record<string, string>;
  /** Additional headers (Authorization is injected automatically). */
  headers?: Record<string, string>;
  /** Abort signal for cancellation. */
  signal?: AbortSignal;
}

export interface RakutenRmsResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

/** Thrown when a write method is attempted on the read-only client. */
export class RakutenRmsReadOnlyError extends Error {
  constructor(method: string) {
    super(
      `Rakuten RMS client is read-only: ${method} is not permitted. ` +
        'Only GET requests are allowed in this integration.'
    );
    this.name = 'RakutenRmsReadOnlyError';
  }
}

/** Thrown when required environment variables are missing or readOnly guard blocks. */
export class RakutenRmsConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RakutenRmsConfigError';
  }
}
