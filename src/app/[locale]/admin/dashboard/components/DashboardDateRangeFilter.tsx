'use client';

import React, { useEffect, useState } from 'react';
import { Button, Space, Typography } from 'antd';
import { getPresetDashboardDateRange } from '../lib/dashboardApi';
import type { DashboardDateRange } from '../lib/dashboardApi';

const { Text } = Typography;

type Props = {
  value: DashboardDateRange;
  loading?: boolean;
  onChange: (value: DashboardDateRange) => void;
};

export const DashboardDateRangeFilter: React.FC<Props> = ({ value, loading = false, onChange }) => {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const applyPreset = (days: number) => {
    const nextRange = getPresetDashboardDateRange(days);
    setDraft(nextRange);
    onChange(nextRange);
  };

  return (
    <Space size="small" wrap>
      <Text type="secondary">统计范围:</Text>
      <input
        aria-label="开始日期"
        type="date"
        value={draft.start}
        onChange={(event) => setDraft((current) => ({ ...current, start: event.target.value }))}
        style={{ height: 32, padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: 6 }}
      />
      <Text type="secondary">至</Text>
      <input
        aria-label="结束日期"
        type="date"
        value={draft.end}
        onChange={(event) => setDraft((current) => ({ ...current, end: event.target.value }))}
        style={{ height: 32, padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: 6 }}
      />
      <Button type="primary" loading={loading} onClick={() => onChange(draft)}>
        应用
      </Button>
      <Button onClick={() => applyPreset(7)}>最近7天</Button>
      <Button onClick={() => applyPreset(30)}>最近30天</Button>
      <Button onClick={() => applyPreset(90)}>最近90天</Button>
    </Space>
  );
};
