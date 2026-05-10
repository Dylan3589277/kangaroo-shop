'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Card, Col, Empty, Row, Segmented, Spin, Table, Typography } from 'antd';
import {
  AccountBookOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  InboxOutlined,
  SettingOutlined,
  StarOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { AlertList } from './AlertList';
import { MetricCard } from './MetricCard';
import { TrendChart } from './TrendChart';
import { COLORS } from '../lib/chart';
import { getModuleData, resolveAlert } from '../lib/dashboardApi';
import { getTrendDisplay, MODULE_NAMES } from '../lib/format';
import type { MetricCard as MetricCardType, ModuleData, ModuleType } from '../lib/types';

const { Title, Text } = Typography;

const MODULE_CONFIG: Record<ModuleType, { icon: React.ReactNode; name: string; color: string }> = {
  hr: { icon: <UserOutlined />, name: '人事', color: COLORS.blue },
  finance: { icon: <AccountBookOutlined />, name: '财务', color: COLORS.purple },
  supply_chain: { icon: <InboxOutlined />, name: '供应链', color: COLORS.cyan },
  operation: { icon: <SettingOutlined />, name: '运营', color: COLORS.yellow },
  influencer: { icon: <StarOutlined />, name: '红人', color: COLORS.green },
};

const PENDING_REAL_DATA_MODULES: ModuleType[] = ['hr', 'finance', 'supply_chain', 'influencer'];

interface Props {
  moduleId: string;
}

export const ModuleDetailPage: React.FC<Props> = ({ moduleId }) => {
  const [data, setData] = useState<ModuleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendRange, setTrendRange] = useState<string>('30天');

  const moduleType = moduleId as ModuleType;
  const isValidModule = moduleId in MODULE_CONFIG;
  const hasPendingRealData = isValidModule && PENDING_REAL_DATA_MODULES.includes(moduleType);

  const fetchData = async () => {
    if (!isValidModule) return;
    try {
      setLoading(true);
      const moduleData = await getModuleData(moduleType);
      setData(moduleData);
    } catch (error) {
      console.error('Failed to fetch module data:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, isValidModule]);

  const metricColumns = useMemo(() => [
    {
      title: '指标名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '当前值',
      key: 'value',
      render: (_: unknown, record: MetricCardType) => (
        hasPendingRealData ? '待接入真实数据' : `${record.value}${record.unit}`
      ),
    },
    {
      title: '预警阈值',
      key: 'threshold',
      render: (_: unknown, record: MetricCardType) => (
        hasPendingRealData ? '部分指标待接入' : <span>&lt;{record.threshold.yellow} {record.unit}</span>
      ),
    },
    {
      title: '告警阈值',
      key: 'redThreshold',
      render: (_: unknown, record: MetricCardType) => (
        hasPendingRealData ? '部分指标待接入' : <span>&lt;{record.threshold.red} {record.unit}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: 'green' | 'yellow' | 'red') => (
        hasPendingRealData ? (
          <Badge status="default" text="待接入" />
        ) : (
          <Badge
            status={status === 'green' ? 'success' : status === 'yellow' ? 'warning' : 'error'}
            text={status === 'green' ? '正常' : status === 'yellow' ? '预警' : '告警'}
          />
        )
      ),
    },
    {
      title: '趋势',
      dataIndex: 'trend',
      key: 'trend',
      render: (trend: number, record: MetricCardType) => {
        if (hasPendingRealData) return '待接入真实数据';
        if (record.trendLabel === '待接入') return '待接入';
        const display = getTrendDisplay(trend);
        return (
          <span style={{ color: display.color }}>
            {display.isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            {display.text}
          </span>
        );
      },
    },
  ], [hasPendingRealData]);

  if (!isValidModule) {
    return <Empty description="模块不存在" />;
  }

  const config = MODULE_CONFIG[moduleType];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) {
    return <Empty description="暂无数据" />;
  }

  const activeAlerts = data.alerts.filter((a) => !a.resolvedAt);
  const days = trendRange === '30天' ? 30 : 90;

  const handleResolveAlert = async (alertId: string, result: string, handler: string) => {
    try {
      await resolveAlert(alertId, handler, result);
      await fetchData();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Title level={3} style={{ marginBottom: '8px' }}>
          <span style={{ color: config.color }}>{config.icon}</span> {config.name}模块
        </Title>
        <Text type="secondary">{MODULE_NAMES[moduleId]}核心指标监控与分析</Text>
      </div>

      {hasPendingRealData && (
        <Alert
          type="warning"
          showIcon
          message="待接入真实数据"
          description="该模块当前仅保留指标框架，HR/财务/供应链/红人等部分指标待接入真实业务数据；页面不会将占位 0 展示为真实经营数据。"
          style={{ marginBottom: '24px' }}
        />
      )}

      <Card title="模块指标" style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          {data.metrics.map((metric) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={metric.id}>
              {hasPendingRealData ? (
                <Card style={{ borderLeft: '4px solid #d9d9d9' }} styles={{ body: { padding: '16px' } }}>
                  <Text type="secondary">{metric.name}</Text>
                  <div style={{ fontSize: '24px', fontWeight: 600, marginTop: '8px' }}>待接入真实数据</div>
                  <Text type="secondary">部分指标待接入</Text>
                </Card>
              ) : (
                <MetricCard metric={metric} />
              )}
            </Col>
          ))}
        </Row>
      </Card>

      {!hasPendingRealData && (
        <Card
          title="指标趋势"
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
            {data.metrics.slice(0, 4).map((metric, index) => {
              const colors = [COLORS.blue, COLORS.purple, COLORS.cyan, COLORS.green];
              const trendData = data.trendData[metric.id] || [];
              return (
                <Col xs={24} lg={12} key={metric.id}>
                  <Card size="small" title={metric.name}>
                    <TrendChart
                      data={trendData.slice(-days)}
                      name={metric.name}
                      color={colors[index % colors.length]}
                      height={200}
                    />
                  </Card>
                </Col>
              );
            })}
          </Row>
        </Card>
      )}

      {activeAlerts.length > 0 && (
        <Card
          title={<span><span style={{ color: '#ff4d4f' }}>●</span> 告警记录 ({activeAlerts.length})</span>}
          style={{ marginBottom: '24px', borderColor: '#ffccc7' }}
        >
          <AlertList alerts={activeAlerts} onResolve={handleResolveAlert} />
        </Card>
      )}

      <Card title="指标明细">
        <Table
          dataSource={data.metrics}
          rowKey="id"
          pagination={false}
          size="small"
          columns={metricColumns}
        />
      </Card>
    </div>
  );
};
