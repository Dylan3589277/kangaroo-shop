import dayjs from 'dayjs';
import type { MetricStatus } from './types';

// 格式化数字
export function formatNumber(value: number, options?: {
  decimals?: number;
  unit?: string;
}): string {
  const { decimals = 0, unit } = options || {};
  let formatted: string;

  if (Math.abs(value) >= 10000000) {
    formatted = (value / 10000000).toFixed(decimals) + '千万';
  } else if (Math.abs(value) >= 10000) {
    formatted = (value / 10000).toFixed(decimals) + '万';
  } else {
    formatted = value.toLocaleString('ja-JP', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  return unit ? `${formatted}${unit}` : formatted;
}

// 格式化金额
export function formatCurrency(value: number, currency = 'JPY'): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// 格式化百分比
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// 获取状态颜色
export function getStatusColor(status: MetricStatus): string {
  const colors: Record<MetricStatus, string> = {
    green: '#52c41a',
    yellow: '#faad14',
    red: '#ff4d4f',
  };
  return colors[status];
}

// 获取状态标签颜色（Ant Design Badge）
export function getStatusBadgeStatus(status: MetricStatus): 'success' | 'warning' | 'error' | 'default' {
  const map: Record<MetricStatus, 'success' | 'warning' | 'error' | 'default'> = {
    green: 'success',
    yellow: 'warning',
    red: 'error',
  };
  return map[status];
}

// 计算剩余时间（倒计时）
export function getRemainingTime(deadline: string): {
  text: string;
  hours: number;
  isOverdue: boolean;
} {
  const now = dayjs();
  const end = dayjs(deadline);
  const diffHours = end.diff(now, 'hour', true);
  const isOverdue = diffHours < 0;

  let text: string;
  if (isOverdue) {
    const overdueHours = Math.abs(diffHours);
    if (overdueHours < 24) {
      text = `已超时${Math.floor(overdueHours)}小时`;
    } else {
      text = `已超时${Math.floor(overdueHours / 24)}天`;
    }
  } else {
    if (diffHours < 24) {
      text = `剩余${Math.floor(diffHours)}小时`;
    } else {
      text = `剩余${Math.floor(diffHours / 24)}天`;
    }
  }

  return { text, hours: diffHours, isOverdue };
}

// 格式化日期
export function formatDate(date: string, format = 'YYYY-MM-DD'): string {
  return dayjs(date).format(format);
}

// 格式化日期时间
export function formatDateTime(date: string): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
}

// 计算趋势显示
export function getTrendDisplay(trend: number): {
  text: string;
  isPositive: boolean;
  color: string;
} {
  const isPositive = trend > 0;
  const text = `${isPositive ? '+' : ''}${trend.toFixed(1)}%`;
  const color = isPositive ? '#52c41a' : '#ff4d4f';
  return { text, isPositive, color };
}

// 模块名称映射
export const MODULE_NAMES: Record<string, string> = {
  hr: '人事',
  finance: '财务',
  supply_chain: '供应链',
  operation: '运营',
  influencer: '红人',
};

// 模块图标映射
export const MODULE_ICONS: Record<string, string> = {
  hr: 'UserOutlined',
  finance: 'AccountBookOutlined',
  supply_chain: 'InboxOutlined',
  operation: 'SettingOutlined',
  influencer: 'StarOutlined',
};
