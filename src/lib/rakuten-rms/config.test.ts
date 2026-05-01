import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildAuthorizationHeader,
  getConfigSummary,
  getRakutenRmsStatus,
  isRakutenRmsConfigured,
  loadRakutenRmsConfig,
} from './config';
import { RakutenRmsConfigError } from './types';

// ─── helpers ────────────────────────────────────────────────────────────────

function setValidEnv() {
  process.env.RAKUTEN_SERVICE_SECRET = 'test-service-secret';
  process.env.RAKUTEN_LICENSE_KEY = 'test-license-key';
  process.env.RAKUTEN_RMS_READ_ONLY = 'true';
}

function clearEnv() {
  delete process.env.RAKUTEN_SERVICE_SECRET;
  delete process.env.RAKUTEN_LICENSE_KEY;
  delete process.env.RAKUTEN_RMS_READ_ONLY;
  delete process.env.RAKUTEN_RMS_BASE_URL;
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('loadRakutenRmsConfig', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('throws RakutenRmsConfigError when RAKUTEN_SERVICE_SECRET is missing', () => {
    process.env.RAKUTEN_LICENSE_KEY = 'lk';
    process.env.RAKUTEN_RMS_READ_ONLY = 'true';

    expect(() => loadRakutenRmsConfig()).toThrow(RakutenRmsConfigError);
    expect(() => loadRakutenRmsConfig()).toThrow('RAKUTEN_SERVICE_SECRET');
  });

  it('throws RakutenRmsConfigError when RAKUTEN_LICENSE_KEY is missing', () => {
    process.env.RAKUTEN_SERVICE_SECRET = 'ss';
    process.env.RAKUTEN_RMS_READ_ONLY = 'true';

    expect(() => loadRakutenRmsConfig()).toThrow(RakutenRmsConfigError);
    expect(() => loadRakutenRmsConfig()).toThrow('RAKUTEN_LICENSE_KEY');
  });

  it('throws RakutenRmsConfigError when RAKUTEN_RMS_READ_ONLY is not "true"', () => {
    process.env.RAKUTEN_SERVICE_SECRET = 'ss';
    process.env.RAKUTEN_LICENSE_KEY = 'lk';
    process.env.RAKUTEN_RMS_READ_ONLY = 'false';

    expect(() => loadRakutenRmsConfig()).toThrow(RakutenRmsConfigError);
    expect(() => loadRakutenRmsConfig()).toThrow('RAKUTEN_RMS_READ_ONLY');
  });

  it('throws when RAKUTEN_RMS_READ_ONLY is absent', () => {
    process.env.RAKUTEN_SERVICE_SECRET = 'ss';
    process.env.RAKUTEN_LICENSE_KEY = 'lk';
    // RAKUTEN_RMS_READ_ONLY intentionally absent

    expect(() => loadRakutenRmsConfig()).toThrow(RakutenRmsConfigError);
  });

  it('returns config with readOnly=true when all vars are present', () => {
    setValidEnv();
    const config = loadRakutenRmsConfig();
    expect(config.readOnly).toBe(true);
    expect(config.serviceSecret).toBe('test-service-secret');
    expect(config.licenseKey).toBe('test-license-key');
  });

  it('uses default baseUrl when RAKUTEN_RMS_BASE_URL is not set', () => {
    setValidEnv();
    const config = loadRakutenRmsConfig();
    expect(config.baseUrl).toBe('https://api.rms.rakuten.co.jp/es/1.0');
  });

  it('uses RAKUTEN_RMS_BASE_URL when set to a Rakuten RMS host', () => {
    setValidEnv();
    process.env.RAKUTEN_RMS_BASE_URL = 'https://api.rms.rakuten.co.jp/es/2.0/';
    const config = loadRakutenRmsConfig();
    // trailing slash should be stripped
    expect(config.baseUrl).toBe('https://api.rms.rakuten.co.jp/es/2.0');
  });

  it('rejects non-Rakuten RAKUTEN_RMS_BASE_URL hosts', () => {
    setValidEnv();
    process.env.RAKUTEN_RMS_BASE_URL = 'https://attacker.example.com/v1/';
    expect(() => loadRakutenRmsConfig()).toThrow(RakutenRmsConfigError);
  });

  it('rejects hostnames that only share a suffix string', () => {
    setValidEnv();
    process.env.RAKUTEN_RMS_BASE_URL = 'https://evilrms.rakuten.co.jp/v1/';
    expect(() => loadRakutenRmsConfig()).toThrow(RakutenRmsConfigError);
  });

  it('rejects non-https RAKUTEN_RMS_BASE_URL values', () => {
    setValidEnv();
    process.env.RAKUTEN_RMS_BASE_URL = 'http://api.rms.rakuten.co.jp/es/1.0/';
    expect(() => loadRakutenRmsConfig()).toThrow(RakutenRmsConfigError);
  });

  it('rejects RAKUTEN_RMS_BASE_URL values with embedded credentials', () => {
    setValidEnv();
    process.env.RAKUTEN_RMS_BASE_URL =
      'https://user:password@api.rms.rakuten.co.jp/es/1.0/';
    expect(() => loadRakutenRmsConfig()).toThrow(RakutenRmsConfigError);
    expect(() => loadRakutenRmsConfig()).toThrow('must not include credentials');
  });
});

describe('getConfigSummary', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('returns configured:true with masked secrets when env is valid', () => {
    setValidEnv();
    const summary = getConfigSummary();
    expect(summary.configured).toBe(true);
    expect(summary.readOnly).toBe(true);
  });

  it('does NOT include the raw serviceSecret in the summary', () => {
    setValidEnv();
    const summary = getConfigSummary();
    const json = JSON.stringify(summary);
    expect(json).not.toContain('test-service-secret');
  });

  it('does NOT include the raw licenseKey in the summary', () => {
    setValidEnv();
    const summary = getConfigSummary();
    const json = JSON.stringify(summary);
    expect(json).not.toContain('test-license-key');
  });

  it('masked fields contain asterisks', () => {
    setValidEnv();
    const summary = getConfigSummary();
    expect(summary.serviceSecretMasked).toContain('*');
    expect(summary.licenseKeyMasked).toContain('*');
  });

  it('throws when config is invalid (missing secret)', () => {
    expect(() => getConfigSummary()).toThrow(RakutenRmsConfigError);
  });
});

describe('getRakutenRmsStatus', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('returns configured:false with a reason when env is missing', () => {
    const status = getRakutenRmsStatus();
    expect(status.configured).toBe(false);
    if (status.configured === false) {
      expect(typeof status.reason).toBe('string');
      expect(status.reason.length).toBeGreaterThan(0);
    }
  });

  it('returns configured:true when env is valid', () => {
    setValidEnv();
    const status = getRakutenRmsStatus();
    expect(status.configured).toBe(true);
  });

  it('never exposes raw secrets in the status object', () => {
    setValidEnv();
    const status = getRakutenRmsStatus();
    const json = JSON.stringify(status);
    expect(json).not.toContain('test-service-secret');
    expect(json).not.toContain('test-license-key');
  });
});

describe('isRakutenRmsConfigured', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('returns false when env vars are absent', () => {
    expect(isRakutenRmsConfigured()).toBe(false);
  });

  it('returns false when RAKUTEN_RMS_READ_ONLY is not "true"', () => {
    process.env.RAKUTEN_SERVICE_SECRET = 'ss';
    process.env.RAKUTEN_LICENSE_KEY = 'lk';
    process.env.RAKUTEN_RMS_READ_ONLY = '1';
    expect(isRakutenRmsConfigured()).toBe(false);
  });

  it('returns true when all required vars are present and readOnly is enabled', () => {
    setValidEnv();
    expect(isRakutenRmsConfigured()).toBe(true);
  });
});

describe('buildAuthorizationHeader', () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it('starts with "ESA " prefix', () => {
    setValidEnv();
    const header = buildAuthorizationHeader();
    expect(header.startsWith('ESA ')).toBe(true);
  });

  it('is derived from serviceSecret and licenseKey (base64 encoded)', () => {
    setValidEnv();
    const header = buildAuthorizationHeader();
    const token = header.replace('ESA ', '');
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    expect(decoded).toBe('test-service-secret:test-license-key');
  });

  it('throws when config is not ready', () => {
    expect(() => buildAuthorizationHeader()).toThrow(RakutenRmsConfigError);
  });

  it('raw secrets are NOT present as plain strings in the encoded token', () => {
    process.env.RAKUTEN_SERVICE_SECRET = 'my-secret-value';
    process.env.RAKUTEN_LICENSE_KEY = 'my-license-value';
    process.env.RAKUTEN_RMS_READ_ONLY = 'true';

    const header = buildAuthorizationHeader();
    // The raw secret strings must not appear literally — only the base64 form.
    expect(header).not.toContain('my-secret-value');
    expect(header).not.toContain('my-license-value');
  });
});
