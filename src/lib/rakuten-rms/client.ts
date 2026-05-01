/**
 * Rakuten RMS Web Service — read-only HTTP client skeleton.
 *
 * Security invariants:
 *  - Only GET requests are permitted; any other method throws immediately.
 *  - The Authorization header is built in memory per request and is never
 *    stored, logged, or returned to callers.
 *  - No real API calls are made in this skeleton; fetch is injected so tests
 *    can swap it out without touching global state.
 */

import { buildAuthorizationHeader, loadRakutenRmsConfig } from './config';
import {
  RakutenRmsReadOnlyError,
  RakutenRmsRequestOptions,
  RakutenRmsResponse,
} from './types';

/** The only HTTP method this client will ever issue. */
const ALLOWED_METHOD = 'GET' as const;

type FetchFn = typeof fetch;

export class RakutenRmsClient {
  private readonly fetchFn: FetchFn;

  /**
   * @param fetchFn - Inject a custom fetch implementation (useful in tests).
   *                  Defaults to the global `fetch`.
   */
  constructor(fetchFn: FetchFn = fetch) {
    this.fetchFn = fetchFn;
  }

  /**
   * Execute a read-only GET request against the Rakuten RMS API.
   *
   * @param path   - API path relative to baseUrl (e.g. "/product/2/search").
   * @param options - Optional query params, extra headers, and abort signal.
   */
  async get<T = unknown>(
    path: string,
    options: RakutenRmsRequestOptions = {}
  ): Promise<RakutenRmsResponse<T>> {
    return this.request<T>(ALLOWED_METHOD, path, options);
  }

  /**
   * Core request dispatcher.
   * Validates the method BEFORE loading config so that write-method rejections
   * are cheap and do not touch env vars.
   */
  async request<T = unknown>(
    method: string,
    path: string,
    options: RakutenRmsRequestOptions = {}
  ): Promise<RakutenRmsResponse<T>> {
    this.guardMethod(method);

    const config = loadRakutenRmsConfig();

    // Build Authorization in memory — do not destructure or store it.
    const authorization = buildAuthorizationHeader();

    const url = new URL(path, config.baseUrl + '/');
    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        url.searchParams.set(key, value);
      }
    }

    const headers: Record<string, string> = {
      // Authorization is injected here and goes nowhere else.
      Authorization: authorization,
      'Content-Type': 'application/json; charset=utf-8',
      ...options.headers,
    };

    const response = await this.fetchFn(url.toString(), {
      method: ALLOWED_METHOD,
      headers,
      signal: options.signal,
    });

    const data = (await response.json()) as T;
    return { ok: response.ok, status: response.status, data };
  }

  /**
   * Throw immediately for any non-GET method.
   * This is the read-only guard at the transport layer.
   */
  private guardMethod(method: string): void {
    const upper = method.toUpperCase();
    if (upper !== ALLOWED_METHOD) {
      throw new RakutenRmsReadOnlyError(upper);
    }
  }
}

/**
 * Create a pre-configured RakutenRmsClient using the current environment.
 * Throws if the environment is not properly configured.
 */
export function createRakutenRmsClient(fetchFn?: FetchFn): RakutenRmsClient {
  return new RakutenRmsClient(fetchFn);
}
