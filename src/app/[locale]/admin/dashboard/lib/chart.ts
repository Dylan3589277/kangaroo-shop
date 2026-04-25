import type { EChartsOption } from 'echarts';
import type { TrendDataPoint } from './types';

// 主题颜色
const COLORS = {
  green: '#52c41a',
  yellow: '#faad14',
  red: '#ff4d4f',
  blue: '#1890ff',
  purple: '#722ed1',
  cyan: '#13c2c2',
};

// 趋势图配置
export function getTrendChartOption(
  data: TrendDataPoint[],
  name: string,
  color = COLORS.blue
): EChartsOption {
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const point = (params as { name: string; value: number }[])[0];
        return `${point.name}<br/>${name}: ${point.value.toFixed(2)}`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.map((d) => d.date),
      axisLabel: {
        formatter: (value: string) => {
          const date = new Date(value);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        },
      },
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 2,
          color,
        },
        itemStyle: {
          color,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: color + '40' },
              { offset: 1, color: color + '05' },
            ],
          },
        },
        data: data.map((d) => d.value),
      },
    ],
  };
}

// 多指标趋势对比图
export function getCompareChartOption(
  dataMap: Record<string, { data: TrendDataPoint[]; name: string; color: string }>,
  valueFormatter?: (value: number) => string
): EChartsOption {
  const series = Object.entries(dataMap).map(([, config]) => ({
    name: config.name,
    type: 'line' as const,
    smooth: true,
    symbol: 'circle',
    symbolSize: 4,
    lineStyle: {
      width: 2,
      color: config.color,
    },
    itemStyle: {
      color: config.color,
    },
    data: config.data.map((d) => d.value),
  }));

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; marker: string; seriesName: string }[];
        let result = p[0].name + '<br/>';
        p.forEach((item) => {
          const value = valueFormatter ? valueFormatter(item.value) : item.value.toFixed(2);
          result += `${item.marker} ${item.seriesName}: ${value}<br/>`;
        });
        return result;
      },
    },
    legend: {
      bottom: 0,
      data: Object.values(dataMap).map((c) => c.name),
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: Object.values(dataMap)[0]?.data.map((d) => d.date) || [],
      axisLabel: {
        formatter: (value: string) => {
          const date = new Date(value);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        },
      },
    },
    yAxis: {
      type: 'value',
    },
    series,
  };
}

// 状态分布饼图
export function getStatusPieOption(
  data: { name: string; value: number; status: 'green' | 'yellow' | 'red' }[]
): EChartsOption {
  const colorMap = {
    green: COLORS.green,
    yellow: COLORS.yellow,
    red: COLORS.red,
  };

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      bottom: 0,
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {c}',
        },
        data: data.map((d) => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: colorMap[d.status] },
        })),
      },
    ],
  };
}

export { COLORS };
