'use client';

import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Segmented, Spin, Empty } from 'antd';
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
import { COLORS } from '../lib/chart';
import { getOverview, resolveAlert } from '../lib/dashboardApi';
import type { ModuleType, OverviewData } from '../lib/types';

const { Title, Text } = Typography;

const MODULE_CONFIG: Record<ModuleType, { icon: React.ReactNode; name: string; color: string }> = {
  hr: { icon: <UserOutlined />, name: '人事', color: COLORS.blue },
  finance: { icon: <AccountBookOutlined />, name: '财务', color: COLORS.purple },
  supply_chain: { icon: <InboxOutlined />, name: '供应链', color: COLORS.cyan },
  operation: { icon: <SettingOutlined />, name: '运营', color: COLORS.yellow },
  influencer: { icon: <StarOutlined />, name: '红人', color: COLORS.green },
};

interface OverviewPageProps {
  initialData?: OverviewData;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ initialData }) => {
  const router = useRouter();
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale || 'zh';
  const [overview, setOverview] = useState<OverviewData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [trendRange, setTrendRange] = useState<string>('30天');

  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
  }, [initialData]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getOverview();
      setOverview(data);
    } catch (error) {
      console.error('Failed to fetch overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId: string, result: string, handler: string) => {
    try {
      await resolveAlert(alertId, handler, result);
      // Refresh data
      await fetchData();
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
                  onClick={() => router.push(`/${locale}/admin/dashboard/${module}`)}
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
