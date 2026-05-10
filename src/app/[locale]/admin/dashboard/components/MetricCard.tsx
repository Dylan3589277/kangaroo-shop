import React from 'react';
import { Card, Tag } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import type { MetricCard as MetricCardType } from '../lib/types';
import { getStatusColor, formatNumber, formatPercent, formatCurrency, getTrendDisplay } from '../lib/format';

interface Props {
  metric: MetricCardType;
  onClick?: () => void;
  /** 趋势数据是否已接入真实数据。false 时不展示假趋势百分比 */
  trendAvailable?: boolean;
}

export const MetricCard: React.FC<Props> = ({ metric, onClick, trendAvailable = false }) => {
  const { name, value, unit, status, trend, trendDirection, trendLabel } = metric;

  const trendDisplay = getTrendDisplay(trend);

  // 根据单位格式化显示
  const formatValue = () => {
    if (unit === '%') return formatPercent(value);
    if (unit === 'JPY') return formatCurrency(value);
    return formatNumber(value, { unit });
  };

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{
        borderLeft: `4px solid ${getStatusColor(status)}`,
        cursor: onClick ? 'pointer' : 'default',
      }}
      styles={{ body: { padding: '16px' } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: '#999', fontSize: '14px', marginBottom: '8px' }}>{name}</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>
            {formatValue()}
          </div>
        </div>
        <Tag
          color={status === 'green' ? 'success' : status === 'yellow' ? 'warning' : 'error'}
          style={{ marginRight: 0 }}
        >
          {status === 'green' ? '正常' : status === 'yellow' ? '预警' : '告警'}
        </Tag>
      </div>

      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {trendAvailable ? (
          <>
            <span style={{ color: trendDisplay.color, fontSize: '14px' }}>
              {trendDirection === 'up' ? (
                <ArrowUpOutlined style={{ marginRight: '4px' }} />
              ) : (
                <ArrowDownOutlined style={{ marginRight: '4px' }} />
              )}
              {trendDisplay.text}
            </span>
            <span style={{ color: '#999', fontSize: '12px' }}>{trendLabel ?? '较上月'}</span>
          </>
        ) : (
          <span style={{ color: '#bbb', fontSize: '12px', fontStyle: 'italic' }}>
            趋势数据待接入
          </span>
        )}
      </div>
    </Card>
  );
};
