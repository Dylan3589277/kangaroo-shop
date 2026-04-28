'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Col, DatePicker, Empty, Row, Select, Spin, Tabs, Typography } from 'antd';
import { BellOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import { AlertList } from './AlertList';
import { getAlerts, resolveAlert } from '../lib/dashboardApi';
import type { Alert as DashboardAlert, ModuleType, MetricStatus } from '../lib/types';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type AlertStatusFilter = MetricStatus | 'all';
type ModuleFilter = ModuleType | 'all';
type DateRange = [string, string] | null;

export const AlertCenterPage: React.FC = () => {
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<AlertStatusFilter>('all');
  const [module, setModule] = useState<ModuleFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getAlerts({ status, module });
      setAlerts(data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, module]);

  const filteredAlerts = useMemo(() => {
    if (!dateRange) return alerts;
    const [start, end] = dateRange;
    return alerts.filter((alert) => {
      const createdDate = alert.createdAt?.slice(0, 10);
      return createdDate >= start && createdDate <= end;
    });
  }, [alerts, dateRange]);

  const stats = {
    total: filteredAlerts.length,
    red: filteredAlerts.filter((a) => a.status === 'red' && !a.resolvedAt).length,
    yellow: filteredAlerts.filter((a) => a.status === 'yellow' && !a.resolvedAt).length,
    resolved: filteredAlerts.filter((a) => a.resolvedAt).length,
  };

  const activeAlerts = filteredAlerts.filter((a) => !a.resolvedAt);
  const resolvedAlerts = filteredAlerts.filter((a) => a.resolvedAt);

  const handleResolveAlert = async (alertId: string, result: string, handler: string) => {
    try {
      await resolveAlert(alertId, handler, result);
      await fetchData();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const handleDateRangeChange = (_dates: null | [Dayjs | null, Dayjs | null], dateStrings: [string, string]) => {
    if (dateStrings[0] && dateStrings[1]) {
      setDateRange(dateStrings);
    } else {
      setDateRange(null);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Title level={3} style={{ marginBottom: '8px' }}>
          <BellOutlined /> 告警中心
        </Title>
        <Text type="secondary">集中管理所有业务告警，支持按状态、模块、时间范围筛选</Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Text type="secondary">全部告警</Text>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.total}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Text type="secondary"><ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> 紧急告警</Text>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff4d4f' }}>{stats.red}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Text type="secondary"><ClockCircleOutlined style={{ color: '#faad14' }} /> 待处理预警</Text>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#faad14' }}>{stats.yellow}</div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Text type="secondary">已处理</Text>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>{stats.resolved}</div>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Text type="secondary">状态:</Text>
            <Select value={status} onChange={setStatus} style={{ width: '100%', marginTop: '8px' }}>
              <Select.Option value="all">全部</Select.Option>
              <Select.Option value="red"><Badge status="error" text="告警" /></Select.Option>
              <Select.Option value="yellow"><Badge status="warning" text="预警" /></Select.Option>
              <Select.Option value="green">已解决</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Text type="secondary">模块:</Text>
            <Select value={module} onChange={setModule} style={{ width: '100%', marginTop: '8px' }}>
              <Select.Option value="all">全部</Select.Option>
              <Select.Option value="hr">人事</Select.Option>
              <Select.Option value="finance">财务</Select.Option>
              <Select.Option value="supply_chain">供应链</Select.Option>
              <Select.Option value="operation">运营</Select.Option>
              <Select.Option value="influencer">红人</Select.Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={12}>
            <Text type="secondary">时间范围:</Text>
            <div style={{ marginTop: '8px' }}>
              <RangePicker onChange={handleDateRangeChange} />
            </div>
          </Col>
        </Row>
      </Card>

      <Card title="告警列表">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></div>
        ) : filteredAlerts.length === 0 ? (
          <Empty description="暂无告警记录" />
        ) : (
          <Tabs
            defaultActiveKey="active"
            items={[
              {
                key: 'active',
                label: <span>待处理 ({activeAlerts.length})</span>,
                children: <AlertList alerts={activeAlerts} onResolve={handleResolveAlert} />,
              },
              {
                key: 'resolved',
                label: <span>已处理 ({resolvedAlerts.length})</span>,
                children: <AlertList alerts={resolvedAlerts} />,
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
};
