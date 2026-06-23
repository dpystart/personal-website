import React from 'react'
import { Table, Tag, Progress, Button, Dropdown, Popconfirm, Space } from 'antd'
import { EditOutlined, DeleteOutlined, DownOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import type { Task, TaskStatus } from './types'
import { CATEGORY_CONFIG, STATUS_CONFIG, PRIORITY_CONFIG } from './types'

interface ListViewProps {
  tasks: Task[]
  onEdit: (task: Task) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  onDelete: (id: string) => void
}

const ListView: React.FC<ListViewProps> = ({ tasks, onEdit, onStatusChange, onDelete }) => {
  const columns: ColumnsType<Task> = [
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Task) => (
        <a
          onClick={() => onEdit(record)}
          style={{
            textDecoration: record.status === 'completed' ? 'line-through' : 'none',
            color: record.status === 'completed' ? '#999' : undefined,
          }}
        >
          {title}
        </a>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      filters: Object.entries(CATEGORY_CONFIG).map(([key, val]) => ({
        text: val.label,
        value: key,
      })),
      onFilter: (value, record) => record.category === value,
      render: (category: Task['category']) => {
        const config = CATEGORY_CONFIG[category]
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      filters: Object.entries(STATUS_CONFIG).map(([key, val]) => ({
        text: val.label,
        value: key,
      })),
      onFilter: (value, record) => record.status === value,
      render: (status: TaskStatus, record: Task) => {
        const config = STATUS_CONFIG[status]
        const items = Object.entries(STATUS_CONFIG).map(([key, val]) => ({
          key,
          label: val.label,
          onClick: () => onStatusChange(record.id, key as TaskStatus),
        }))
        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <span style={{ cursor: 'pointer' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: config.color,
                  marginRight: 6,
                }}
              />
              {config.label}
              <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
            </span>
          </Dropdown>
        )
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      filters: Object.entries(PRIORITY_CONFIG).map(([key, val]) => ({
        text: val.label,
        value: key,
      })),
      onFilter: (value, record) => record.priority === value,
      sorter: (a, b) => {
        const order = ['P0', 'P1', 'P2', 'P3']
        return order.indexOf(a.priority) - order.indexOf(b.priority)
      },
      render: (priority: Task['priority']) => {
        const config = PRIORITY_CONFIG[priority]
        return (
          <Tag
            style={{
              color: config.color,
              backgroundColor: config.bg,
              borderColor: config.color,
            }}
          >
            {config.label}
          </Tag>
        )
      },
    },
    {
      title: '截止日期',
      dataIndex: 'dueDate',
      key: 'dueDate',
      sorter: (a, b) => {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return dayjs(a.dueDate).unix() - dayjs(b.dueDate).unix()
      },
      render: (dueDate: string | undefined, record: Task) => {
        if (!dueDate) return '—'
        const isOverdue =
          record.status !== 'completed' && dayjs(dueDate).isBefore(dayjs(), 'day')
        return (
          <span style={{ color: isOverdue ? '#ef4444' : undefined, fontWeight: isOverdue ? 500 : undefined }}>
            {dayjs(dueDate).format('YYYY-MM-DD')}
          </span>
        )
      },
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number) => {
        if (progress > 0) {
          return <Progress percent={progress} size="small" style={{ width: 100 }} />
        }
        return '—'
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: Task) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          />
          <Popconfirm
            title="确认删除该任务？"
            onConfirm={() => onDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={tasks}
      rowKey="id"
      size="middle"
      pagination={{ pageSize: 20, showSizeChanger: true }}
    />
  )
}

export default ListView
