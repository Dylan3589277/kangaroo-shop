/**
 * Rakuten RMS Web Service — read-only HTTP client skeleton.
 *
 * Security invariants:
 *  - Only GET requests are permitted; any other method throws immediately.
 *  - The Authorization header is built in memory per request and is never
 *    stored, logged, or returned to callers.
 *  - Non-JSON responses are converted to a safe structured error so callers
 *    never leak secrets and never crash on HTML error pages.
 *  - No real API calls are made in this skeleton; fetch is injected so tests
 *    can swap it out without touching global state.
 */

import { buildAuthorizationHeader, loadRakutenRmsConfig } from './config';
import {
  RakutenRmsPathError,
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
   * @param path   - API path relative to baseUrl (e.g. "/items/search").
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
    const relativePath = this.guardAndNormalizePath(path);

    const config = loadRakutenRmsConfig();

    // Build Authorization in memory — do not destructure or store it.
    const authorization = buildAuthorizationHeader();

    const url = new URL(relativePath, config.baseUrl + '/');
    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        url.searchParams.set(key, value);
      }
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...options.headers,
      // Authorization is injected last so callers cannot override it.
      Authorization: authorization,
    };

    const response = await this.fetchFn(url.toString(), {
      method: ALLOWED_METHOD,
      headers,
      signal: options.signal,
    });

    const parsed = await this.parseResponse<T>(response);
    return { ok: response.ok && parsed.isJson, status: response.status, data: parsed.data };
  }

  /**
   * Parse Rakuten responses defensively. Wrong API paths or auth failures can
   * return HTML, which must become a safe error object instead of SyntaxError.
   */
  private async parseResponse<T>(response: Response): Promise<{ isJson: boolean; data: T }> {
    const contentType = response.headers?.get('content-type') ?? '';

    if (!contentType || /(^|[\s;])application\/json($|[\s;])/i.test(contentType) || /\+json($|[\s;])/i.test(contentType)) {
      try {
        return { isJson: true, data: (await response.json()) as T };
      } catch {
        // Fall through to text parsing below. Some mocks and error pages lie about content-type.
      }
    }

    let bodySnippet = '';
    try {
      bodySnippet = (await response.text()).slice(0, 500);
    } catch {
      bodySnippet = '';
    }

    return {
      isJson: false,
      data: {
        error: 'Rakuten RMS returned a non-JSON response.',
        status: response.status,
        contentType: contentType || 'unknown',
        bodySnippet,
      } as T,
    };
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

  /**
   * Only allow relative API paths so ESA credentials never leave Rakuten's host.
   * Leading slashes are normalized instead of passed to new URL(), because
   * absolute-path resolution would otherwise drop the /es/1.0 base path.
   */
  private guardAndNormalizePath(path: string): string {
    if (
      /^[a-z][a-z\d+.-]*:/i.test(path) ||
      path.startsWith('//') ||
      path.includes('\\')
    ) {
      throw new RakutenRmsPathError();
    }

    const normalizedPath = path.replace(/^\/+/, '');
    const segments = normalizedPath.split('/');

    for (const segment of segments) {
      let decodedSegment: string;
      try {
        decodedSegment = decodeURIComponent(segment);
      } catch {
        throw new RakutenRmsPathError();
      }

      if (
        segment === '.' ||
        segment === '..' ||
        decodedSegment === '.' ||
        decodedSegment === '..' ||
        decodedSegment.includes('\\')
      ) {
        throw new RakutenRmsPathError();
      }
    }

    return normalizedPath;
  }
}

/**
 * Create a pre-configured RakutenRmsClient using the current environment.
 * Throws if the environment is not properly configured.
 */
export function createRakutenRmsClient(fetchFn?: FetchFn): RakutenRmsClient {
  return new RakutenRmsClient(fetchFn);
}
