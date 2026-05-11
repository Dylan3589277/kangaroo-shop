'use client';

import React, { useEffect, useState } from 'react';
import { Alert, Button, Row, Col, Card, Typography, Segmented, Spin, Empty, Tag, Progress } from 'antd';
import {
  UserOutlined,
  AccountBookOutlined,
  InboxOutlined,
  SettingOutlined,
  StarOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import { MetricCard } from './MetricCard';
import { TrendChart } from './TrendChart';
import { AlertList } from './AlertList';
import { DashboardDateRangeFilter } from './DashboardDateRangeFilter';
import { COLORS } from '../lib/chart';
import { getDefaultDashboardDateRange, getOverview, resolveAlert } from '../lib/dashboardApi';
import type { MetricStatus, ModuleType, OverviewData, RakutenSyncHealthSummary } from '../lib/types';
import type { DashboardDateRange } from '../lib/dashboardApi';

const { Title, Text } = Typography;

const MODULE_CONFIG: Record<ModuleType, { icon: React.ReactNode; name: string; color: string }> = {
  hr: { icon: <UserOutlined />, name: '人事', color: COLORS.blue },
  finance: { icon: <AccountBookOutlined />, name: '财务', color: COLORS.purple },
  supply_chain: { icon: <InboxOutlined />, name: '供应链', color: COLORS.cyan },
  operation: { icon: <SettingOutlined />, name: '运营', color: COLORS.yellow },
  influencer: { icon: <StarOutlined />, name: '红人', color: COLORS.green },
};

const STATUS_TAG: Record<MetricStatus, { color: string; label: string }> = {
  green: { color: 'success', label: '正常' },
  yellow: { color: 'warning', label: '预警' },
  red: { color: 'error', label: '告警' },
};

const JOB_STATUS_LABEL: Record<string, string> = {
  pending: '等待中',
  running: '同步中',
  done: '已完成',
  failed: '失败',
};

function formatHealthNumber(value: number, unit = '') {
  return `${value.toLocaleString('ja-JP')}${unit}`;
}

function formatHealthPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatLatestJobAge(value: number | null) {
  return value === null ? '暂无' : `${value.toFixed(1)}小时`;
}

function formatLatestJobAt(value: string | null) {
  if (!value) return '暂无同步作业';
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function RakutenHealthCard({ health }: { health: RakutenSyncHealthSummary }) {
  const status = STATUS_TAG[health.status];
  const latestJobStatusLabel = health.latestJobStatus
    ? JOB_STATUS_LABEL[health.latestJobStatus] ?? health.latestJobStatus
    : '暂无';
  const successStrokeColor = health.status === 'green' ? COLORS.green : health.status === 'yellow' ? COLORS.yellow : COLORS.red;
  const summaryItems = [
    { label: '距上次同步', value: formatLatestJobAge(health.latestJobAgeHours), hint: '越短越新鲜' },
    { label: '近30天作业数', value: formatHealthNumber(health.recentJobCount, '次'), hint: `失败 ${formatHealthNumber(health.failedRecentJobs, '次')}` },
    { label: '成功导入行', value: formatHealthNumber(health.recentImportedRows, '行'), hint: `错误 ${formatHealthNumber(health.recentErrorRows, '行')}` },
  ];
  const listingItems = [
    { label: '全部记录', value: health.listingCounts.total, color: COLORS.blue },
    { label: '有效上架', value: health.listingCounts.active, color: COLORS.green },
    { label: '库存可售', value: health.listingCounts.sellable, color: COLORS.cyan },
    { label: '缺货', value: health.listingCounts.outOfStock, color: COLORS.red },
    { label: '低库存', value: health.listingCounts.lowStock, color: COLORS.yellow },
  ];

  return (
    <Card
      title="Rakuten 同步健康"
      extra={<Tag color={status.color}>{status.label}</Tag>}
      style={{ marginBottom: '24px' }}
    >
      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} lg={7}>
          <div style={{ border: '1px solid #f0f0f0', borderRadius: '8px', padding: '16px', height: '100%' }}>
            <div style={{ color: '#999', fontSize: '13px', marginBottom: '8px' }}>最新同步状态</div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: '#333', marginBottom: '6px' }}>
              {latestJobStatusLabel}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              最近执行：{formatLatestJobAt(health.latestJobAt)}
            </Text>
          </div>
        </Col>

        <Col xs={24} lg={5}>
          <div style={{ border: '1px solid #f0f0f0', borderRadius: '8px', padding: '16px', height: '100%' }}>
            <div style={{ color: '#999', fontSize: '13px', marginBottom: '8px' }}>近30天导入成功率</div>
            <Progress
              percent={Number(health.successRate.toFixed(1))}
              strokeColor={successStrokeColor}
              trailColor="#f5f5f5"
              size="small"
            />
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#333', marginTop: '6px' }}>
              {formatHealthPercent(health.successRate)}
            </div>
          </div>
        </Col>

        <Col xs={24} lg={12}>
          <Row gutter={[12, 12]}>
            {summaryItems.map(item => (
              <Col xs={24} sm={8} key={item.label}>
                <div style={{ border: '1px solid #f0f0f0', borderRadius: '8px', padding: '14px', height: '100%' }}>
                  <div style={{ color: '#999', fontSize: '13px', marginBottom: '6px' }}>{item.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#333' }}>{item.value}</div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>{item.hint}</Text>
                </div>
              </Col>
            ))}
          </Row>
        </Col>

        <Col xs={24}>
          <div style={{ color: '#999', fontSize: '13px', marginBottom: '8px' }}>商品库存概览</div>
          <Row gutter={[12, 12]}>
            {listingItems.map(item => (
              <Col xs={12} sm={8} md={4} key={item.label}>
                <div style={{ border: '1px solid #f0f0f0', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ color: '#999', fontSize: '13px', marginBottom: '6px' }}>{item.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: item.color }}>
                    {formatHealthNumber(item.value, '件')}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Col>
      </Row>
    </Card>
  );
}

interface OverviewPageProps {
  initialData?: OverviewData;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ initialData }) => {
  const router = useRouter();
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale || 'zh';
  const [overview, setOverview] = useState<OverviewData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [trendRange, setTrendRange] = useState<string>('30天');
  const [dateRange, setDateRange] = useState<DashboardDateRange>(() => getDefaultDashboardDateRange());

  useEffect(() => {
    fetchData(dateRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const fetchData = async (range = dateRange) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await getOverview(range);
      setOverview(data);
    } catch (error) {
      console.error('Failed to fetch overview:', error);
      setOverview(null);
      setErrorMessage(error instanceof Error ? error.message : 'Dashboard 数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId: string, result: string, handler: string) => {
    try {
      await resolveAlert(alertId, handler, result);
      // Refresh data
      await fetchData(dateRange);
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <Title level={3} style={{ marginBottom: '8px' }}>
            <DashboardOutlined /> 全局健康总览
          </Title>
          <Text type="secondary">
            实时监控classe跨境电商核心经营与同步指标，及时发现并处理异常情况
          </Text>
          <div style={{ marginTop: '16px' }}>
            <DashboardDateRangeFilter value={dateRange} loading={loading} onChange={setDateRange} />
          </div>
        </div>
        <Alert
          type="error"
          showIcon
          message="Dashboard 加载失败"
          description={errorMessage}
          action={
            <Button size="small" danger onClick={() => void fetchData(dateRange)}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  if (!overview) {
    return <Empty description="暂无数据" />;
  }

  const activeAlerts = overview.alerts.filter((a) => !a.resolvedAt);

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={3} style={{ marginBottom: '8px' }}>
          <DashboardOutlined /> 全局健康总览
        </Title>
        <Text type="secondary">
          实时监控classe跨境电商核心经营与同步指标，及时发现并处理异常情况
        </Text>
        <br />
        <Text type="secondary" style={{ color: '#faad14', fontSize: '13px' }}>
          ⚠️ 趋势环比数据暂未接入真实上游，卡片中趋势百分比显示为「趋势数据待接入」
        </Text>
        <div style={{ marginTop: '16px' }}>
          <DashboardDateRangeFilter value={dateRange} loading={loading} onChange={setDateRange} />
        </div>
      </div>

      {/* 核心指标卡片 */}
      <Card title="核心经营/同步指标" style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          {overview.metrics.map((metric) => (
            <Col xs={24} sm={12} lg={8} xl={4} key={metric.id}>
              <MetricCard metric={metric} />
            </Col>
          ))}
        </Row>
      </Card>

      {overview.rakutenSyncHealth && (
        <RakutenHealthCard health={overview.rakutenSyncHealth} />
      )}

      {/* 异常告警栏 */}
      {activeAlerts.length > 0 && (
        <Card
          title={
            <span>
              <span style={{ color: '#ff4d4f' }}>●</span> 异常告警 ({activeAlerts.length})
            </span>
          }
          style={{ marginBottom: '24px', borderColor: '#ffccc7' }}
        >
          <AlertList
            alerts={activeAlerts}
            onResolve={handleResolveAlert}
          />
        </Card>
      )}

      {/* 趋势图区域 */}
      <Card
        title="核心指标趋势"
        extra={
          <Segmented
            value={trendRange}
            onChange={(value) => setTrendRange(value as string)}
            options={['30天', '90天']}
          />
        }
        style={{ marginBottom: '24px' }}
      >
        <Row gutter={[16, 16]}>
          {overview.metrics.slice(0, 4).map((metric, index) => {
            const colors = [COLORS.blue, COLORS.purple, COLORS.cyan, COLORS.green];
            const data = overview.trendData[metric.id] || [];
            // 根据趋势范围截取数据
            const days = trendRange === '30天' ? 30 : 90;
            const slicedData = data.slice(-days);

            return (
              <Col xs={24} lg={12} key={metric.id}>
                <TrendChart
                  data={slicedData}
                  name={metric.name}
                  color={colors[index % colors.length]}
                  height={250}
                />
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* 快速入口 */}
      <Card title="模块详情">
        <Row gutter={[16, 16]}>
          {(Object.keys(MODULE_CONFIG) as ModuleType[]).map((module) => {
            const config = MODULE_CONFIG[module];
            return (
              <Col xs={12} sm={8} lg={4} key={module}>
                <Card
                  hoverable
                  onClick={() => router.push(`/${locale}/admin/dashboard/${module}?start=${dateRange.start}&end=${dateRange.end}`)}
                  style={{ textAlign: 'center' }}
                >
                  <div style={{ fontSize: '32px', color: config.color, marginBottom: '8px' }}>
                    {config.icon}
                  </div>
                  <Text strong>{config.name}</Text>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>
    </div>
  );
};
