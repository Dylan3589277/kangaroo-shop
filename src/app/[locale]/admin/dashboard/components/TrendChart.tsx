import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { TrendDataPoint } from '../lib/types';
import { getTrendChartOption, COLORS } from '../lib/chart';

interface Props {
  data: TrendDataPoint[];
  name: string;
  color?: string;
  height?: number;
}

export const TrendChart: React.FC<Props> = ({
  data,
  name,
  color = COLORS.blue,
  height = 300,
}) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
        暂无数据
      </div>
    );
  }

  const option = getTrendChartOption(data, name, color);

  return (
    <ReactECharts
      option={option}
      style={{ height }}
      opts={{ renderer: 'canvas' }}
    />
  );
};
