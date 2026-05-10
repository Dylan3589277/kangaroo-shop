import type { OverviewData, Alert, ModuleData, ModuleType } from './types';

const API_BASE = '/api/dashboard';

export type DashboardDateRange = {
  start: string;
  end: string;
};

export function getDefaultDashboardDateRange(): DashboardDateRange {
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 29);
  const start = startDate.toISOString().slice(0, 10);

  return { start, end };
}

export function getPresetDashboardDateRange(days: number): DashboardDateRange {
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (days - 1));
  const start = startDate.toISOString().slice(0, 10);

  return { start, end };
}

function withDateRange(url: string, dateRange?: DashboardDateRange) {
  if (!dateRange) return url;

  const params = new URLSearchParams({
    start: dateRange.start,
    end: dateRange.end,
  });

  return `${url}?${params.toString()}`;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error || `Request failed with status ${res.status}`);
  }
  return json.data;
}

export async function getOverview(dateRange?: DashboardDateRange): Promise<OverviewData> {
  return fetchJson<OverviewData>(withDateRange(`${API_BASE}/overview`, dateRange));
}

export async function getModuleData(module: ModuleType, dateRange?: DashboardDateRange): Promise<ModuleData> {
  return fetchJson<ModuleData>(withDateRange(`${API_BASE}/${module}`, dateRange));
}

export async function getAlerts(params?: {
  status?: string;
  module?: string;
}): Promise<Alert[]> {
  const searchParams = new URLSearchParams();
  if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
  if (params?.module && params.module !== 'all') searchParams.set('module', params.module);
  const query = searchParams.toString();
  return fetchJson<Alert[]>(`${API_BASE}/alerts${query ? `?${query}` : ''}`);
}

export async function resolveAlert(
  alertId: string,
  handler: string,
  handlingResult: string
): Promise<Alert> {
  return fetchJson<Alert>(`${API_BASE}/alerts/${alertId}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({ handler, handlingResult }),
  });
}

export async function createAlert(data: {
  metricId: string;
  metricName: string;
  module: ModuleType;
  status: string;
  threshold: number;
  currentValue: number;
  assignee?: string;
  deadline?: string;
}): Promise<Alert> {
  return fetchJson<Alert>(`${API_BASE}/alerts`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
