// 指标状态
export type MetricStatus = 'green' | 'yellow' | 'red';

// 核心指标卡片
export interface MetricCard {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: MetricStatus;
  threshold: {
    yellow: number;
    red: number;
  };
  trend: number; // 百分比变化
  trendDirection: 'up' | 'down';
}

// 告警记录
export interface Alert {
  id: string;
  metricId: string;
  metricName: string;
  module: ModuleType;
  status: MetricStatus;
  threshold: number;
  currentValue: number;
  assignee: string;
  createdAt: string;
  deadline: string;
  handlingResult?: string;
  handler?: string;
  resolvedAt?: string;
}

// 模块类型
export type ModuleType = 'hr' | 'finance' | 'supply_chain' | 'operation' | 'influencer';

// 模块信息
export interface ModuleInfo {
  id: ModuleType;
  name: string;
  icon: string;
  description: string;
}

// 趋势数据点
export interface TrendDataPoint {
  date: string;
  value: number;
}

// 模块数据
export interface ModuleData {
  id: ModuleType;
  name: string;
  metrics: MetricCard[];
  alerts: Alert[];
  trendData: Record<string, TrendDataPoint[]>;
}

// 总览数据
export interface OverviewData {
  metrics: MetricCard[];
  alerts: Alert[];
  trendData: Record<string, TrendDataPoint[]>;
}

// 筛选条件
export interface AlertFilters {
  status?: MetricStatus | 'all';
  module?: ModuleType | 'all';
  dateRange?: [string, string];
}

// 分页
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

// API 响应格式
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
