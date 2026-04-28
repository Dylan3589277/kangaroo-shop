import React from 'react';
import { Tag } from 'antd';
import type { MetricStatus } from '@/app/[locale]/admin/dashboard/lib/types';
import { getStatusColor } from '@/app/[locale]/admin/dashboard/lib/format';

interface Props {
  status: MetricStatus;
  showText?: boolean;
}

const STATUS_CONFIG: Record<MetricStatus, { text: string; bgColor: string; borderColor: string }> = {
  green: {
    text: '正常',
    bgColor: '#f6ffed',
    borderColor: '#b7eb8f',
  },
  yellow: {
    text: '预警',
    bgColor: '#fffbe6',
    borderColor: '#ffe58f',
  },
  red: {
    text: '告警',
    bgColor: '#fff2f0',
    borderColor: '#ffccc7',
  },
};

export const StatusTag: React.FC<Props> = ({ status, showText = true }) => {
  const config = STATUS_CONFIG[status];

  return (
    <Tag
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
        color: getStatusColor(status),
      }}
    >
      {showText ? config.text : '●'}
    </Tag>
  );
};
