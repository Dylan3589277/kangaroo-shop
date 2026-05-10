import { describe, expect, it } from 'vitest';
import { parseDashboardDateRange } from './dashboard-date-range';

const fixedNow = new Date('2026-05-10T12:00:00.000Z');

describe('parseDashboardDateRange', () => {
  it('defaults to the latest 30 calendar days including today', () => {
    const result = parseDashboardDateRange(new URLSearchParams(), fixedNow);

    expect(result.range?.start).toBe('2026-04-11');
    expect(result.range?.end).toBe('2026-05-10');
    expect(result.range?.days).toHaveLength(30);
  });

  it('accepts an inclusive custom range', () => {
    const result = parseDashboardDateRange(new URLSearchParams('start=2026-05-01&end=2026-05-03'), fixedNow);

    expect(result.range?.days).toEqual(['2026-05-01', '2026-05-02', '2026-05-03']);
    expect(result.range?.endExclusiveDate.toISOString()).toBe('2026-05-04T00:00:00.000Z');
  });

  it('rejects invalid date format', () => {
    const result = parseDashboardDateRange(new URLSearchParams('start=2026-5-01&end=2026-05-03'), fixedNow);

    expect(result.response?.status).toBe(400);
  });

  it('rejects start after end', () => {
    const result = parseDashboardDateRange(new URLSearchParams('start=2026-05-04&end=2026-05-03'), fixedNow);

    expect(result.response?.status).toBe(400);
  });

  it('rejects ranges longer than 366 days', () => {
    const result = parseDashboardDateRange(new URLSearchParams('start=2025-01-01&end=2026-01-02'), fixedNow);

    expect(result.response?.status).toBe(400);
  });
});
