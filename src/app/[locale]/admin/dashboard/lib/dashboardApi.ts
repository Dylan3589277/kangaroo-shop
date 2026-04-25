import type { OverviewData, Alert, ModuleType } from './types';

const API_BASE = '/api/dashboard';

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

export async function getOverview(): Promise<OverviewData> {
  return fetchJson<OverviewData>(`${API_BASE}/overview`);
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
