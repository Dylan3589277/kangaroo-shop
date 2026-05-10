import { NextResponse } from 'next/server';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DashboardDateRange = {
  start: string;
  end: string;
  startDate: Date;
  endExclusiveDate: Date;
  days: string[];
};

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function parseDateOnly(value: string) {
  if (!DATE_RE.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;

  return toDateString(date) === value ? date : null;
}

function badRequest(error: string) {
  return NextResponse.json({ data: null, error }, { status: 400 });
}

export function parseDashboardDateRange(
  searchParams: URLSearchParams,
  now = new Date()
): { range: DashboardDateRange; response?: never } | { range?: never; response: NextResponse } {
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');

  if ((startParam && !endParam) || (!startParam && endParam)) {
    return { response: badRequest('start and end must be provided together') };
  }

  const today = new Date(`${toDateString(now)}T00:00:00.000Z`);
  const defaultEnd = toDateString(today);
  const defaultStart = toDateString(addDays(today, -29));
  const start = startParam ?? defaultStart;
  const end = endParam ?? defaultEnd;

  const startDate = parseDateOnly(start);
  const endDate = parseDateOnly(end);
  if (!startDate || !endDate) {
    return { response: badRequest('start and end must use YYYY-MM-DD') };
  }

  if (startDate.getTime() > endDate.getTime()) {
    return { response: badRequest('start must be before or equal to end') };
  }

  const dayCount = Math.floor((endDate.getTime() - startDate.getTime()) / DAY_MS) + 1;
  if (dayCount > 366) {
    return { response: badRequest('date range must not exceed 366 days') };
  }

  const days = Array.from({ length: dayCount }, (_, index) => toDateString(addDays(startDate, index)));

  return {
    range: {
      start,
      end,
      startDate,
      endExclusiveDate: addDays(endDate, 1),
      days,
    },
  };
}
