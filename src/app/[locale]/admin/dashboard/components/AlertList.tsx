import React, { useState } from 'react';
import { Table, Tag, Button, Modal, Input, Form, Tooltip, Badge } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { Alert } from '../lib/types';
import { formatDateTime, getRemainingTime, getStatusBadgeStatus, MODULE_NAMES } from '../lib/format';

interface Props {
  alerts: Alert[];
  loading?: boolean;
  onResolve?: (alertId: string, result: string, handler: string) => void;
}

export const AlertList: React.FC<Props> = ({
  alerts,
  loading = false,
  onResolve,
}) => {
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [form] = Form.useForm();

  const handleResolve = (alert: Alert) => {
    setSelectedAlert(alert);
    setResolveModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (selectedAlert && onResolve) {
        onResolve(selectedAlert.id, values.result, values.handler);
      }
      setResolveModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const columns = [
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: 'green' | 'yellow' | 'red') => (
        <Badge status={getStatusBadgeStatus(status)} text={status === 'green' ? '已解决' : status === 'yellow' ? '预警' : '告警'} />
      ),
    },
    {
      title: '指标名称',
      dataIndex: 'metricName',
      key: 'metricName',
      width: 120,
    },
    {
      title: '模块',
      dataIndex: 'module',
      key: 'module',
      width: 80,
      render: (module: string) => MODULE_NAMES[module] || module,
    },
    {
      title: '阈值',
      dataIndex: 'threshold',
      key: 'threshold',
      width: 80,
      render: (threshold: number) => threshold,
    },
    {
      title: '当前值',
      dataIndex: 'currentValue',
      key: 'currentValue',
      width: 80,
    },
    {
      title: '负责人',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 80,
      render: (assignee: string) => assignee,
    },
    {
      title: '处理时效',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 120,
      render: (deadline: string, record: Alert) => {
        // 如果已解决，显示解决时间
        if (record.resolvedAt) {
          return (
            <Tooltip title={`处理人: ${record.handler}`}>
              <span style={{ color: '#52c41a' }}>
                <CheckCircleOutlined /> 已解决
              </span>
            </Tooltip>
          );
        }
        const { text, hours, isOverdue } = getRemainingTime(deadline);
        return (
          <Tag
            icon={<ClockCircleOutlined />}
            color={isOverdue ? 'red' : hours < 24 ? 'orange' : 'blue'}
          >
            {text}
          </Tag>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_unknown: unknown, record: Alert) => {
        if (record.resolvedAt) {
          return (
            <Tooltip title={`处理结果: ${record.handlingResult}`}>
              <Button type="link" size="small">查看</Button>
            </Tooltip>
          );
        }
        return (
          <Button
            type="link"
            size="small"
            onClick={() => handleResolve(record)}
          >
            处理
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={alerts}
        rowKey="id"
        loading={loading}
        pagination={alerts.length > 10 ? { pageSize: 10 } : false}
        size="small"
      />

      <Modal
        title="处理告警"
        open={resolveModalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setResolveModalVisible(false);
          form.resetFields();
        }}
        okText="确认处理"
        cancelText="取消"
      >
        {selectedAlert && (
          <div style={{ marginBottom: '16px' }}>
            <p>
              <strong>指标:</strong> {selectedAlert.metricName}
            </p>
            <p>
              <strong>当前值:</strong> {selectedAlert.currentValue} (阈值: {selectedAlert.threshold})
            </p>
          </div>
        )}
        <Form form={form} layout="vertical">
          <Form.Item
            name="handler"
            label="处理人"
            rules={[{ required: true, message: '请输入处理人姓名' }]}
          >
            <Input placeholder="请输入处理人姓名" />
          </Form.Item>
          <Form.Item
            name="result"
            label="处理结果"
            rules={[{ required: true, message: '请输入处理结果' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="请详细描述处理过程和结果"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
