import { afterEach, describe, expect, it, vi } from 'vitest';

describe('serverError', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('hides internal messages in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { serverError } = await import('./api-error');

    const response = serverError(new Error('database password leaked'));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Internal server error' });
  });

  it('keeps internal messages in development for debugging', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { serverError } = await import('./api-error');

    const response = serverError(new Error('debug detail'));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'debug detail' });
  });

  it('rethrows Next.js dynamic server usage bailout signals', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { serverError } = await import('./api-error');
    const dynamicUsageError = Object.assign(new Error('dynamic server usage'), {
      digest: 'DYNAMIC_SERVER_USAGE',
    });

    expect(() => serverError(dynamicUsageError)).toThrow(dynamicUsageError);
  });
});
