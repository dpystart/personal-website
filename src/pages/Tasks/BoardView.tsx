import React, { useState } from 'react'
import { Card, Tag, Progress, Badge, Typography, Button, Select, Popconfirm } from 'antd'
import { PlusOutlined, FilterOutlined, DeleteOutlined } from '@ant-design/icons'
import type { Task, TaskStatus, TaskCategory } from './types'
import { CATEGORY_CONFIG, STATUS_CONFIG, PRIORITY_CONFIG } from './types'

const { Text } = Typography

interface BoardViewProps {
  tasks: Task[]
  onEdit: (task: Task) => void
  onStatusChange: (id: string, status: TaskStatus) => void
  onDelete: (id: string) => void
  onAddTask: (category: TaskCategory) => void
}

const CATEGORY_BG: Record<TaskCategory, string> = {
  cluster: '#eff6ff',
  fault: '#fef2f2',
  alert: '#fff7ed',
  delivery: '#faf5ff',
  other: '#f8fafc',
}

const COLUMNS: TaskCategory[] = ['cluster', 'fault', 'alert', 'delivery', 'other']

const BoardView: React.FC<BoardViewProps> = ({ tasks, onEdit, onStatusChange, onDelete, onAddTask }) => {
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>(['blocked', 'pending', 'in_progress'])
  const [priorityFilter, setPriorityFilter] = useState<string[]>([])

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter.length > 0 && !statusFilter.includes(t.status)) return false
    if (priorityFilter.length > 0 && !priorityFilter.includes(t.priority)) return false
    return true
  })

  const renderCard = (task: Task) => {
    const isCompleted = task.status === 'completed'
    const priorityCfg = PRIORITY_CONFIG[task.priority]
    const statusCfg = STATUS_CONFIG[task.status]

    return (
      <Card
        key={task.id}
        size="small"
        style={{
          marginBottom: 10,
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          opacity: isCompleted ? 0.6 : 1,
          cursor: 'pointer',
          transition: 'box-shadow 0.2s',
        }}
        bodyStyle={{ padding: '12px 14px' }}
        hoverable
        onClick={() => onEdit(task)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: isCompleted ? '#94a3b8' : '#1e293b',
              textDecoration: isCompleted ? 'line-through' : 'none',
              flex: 1,
            }}
          >
            {task.title}
          </Text>
          <Popconfirm
            title="确定删除该任务？"
            onConfirm={(e) => { e?.stopPropagation(); onDelete(task.id) }}
            onCancel={(e) => e?.stopPropagation()}
            okText="删除"
            cancelText="取消"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
              style={{ width: 24, height: 24, padding: 0, opacity: 0.4 }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4' }}
            />
          </Popconfirm>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <Tag
            style={{
              color: priorityCfg.color,
              backgroundColor: priorityCfg.bg,
              border: 'none',
              borderRadius: 4,
              fontSize: 12,
              lineHeight: '20px',
              margin: 0,
            }}
          >
            {priorityCfg.label}
          </Tag>
          <Tag
            style={{
              color: statusCfg.color,
              backgroundColor: `${statusCfg.color}15`,
              border: 'none',
              borderRadius: 4,
              fontSize: 12,
              lineHeight: '20px',
              margin: 0,
            }}
          >
            {statusCfg.label}
          </Tag>
          {task.dueDate && (
            <Text style={{ fontSize: 12, color: task.dueDate < new Date().toISOString().slice(0, 10) && !isCompleted ? '#ef4444' : '#64748b' }}>
              📅 {task.dueDate}
            </Text>
          )}
        </div>

        {task.progress > 0 && (
          <Progress
            percent={task.progress}
            size="small"
            strokeColor={{ from: '#3b82f6', to: '#6366f1' }}
            style={{ marginTop: 4, marginBottom: 0 }}
          />
        )}

        {/* 快捷状态切换 */}
        <div
          style={{ display: 'flex', gap: 4, borderTop: '1px solid #f1f5f9', paddingTop: 8, marginTop: 8 }}
          onClick={(e) => e.stopPropagation()}
        >
          {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => (
            <Button
              key={s}
              size="small"
              type={task.status === s ? 'primary' : 'text'}
              style={{
                flex: 1,
                fontSize: 11,
                padding: '2px 0',
                height: 24,
                borderRadius: 4,
                color: task.status === s ? '#fff' : STATUS_CONFIG[s].color,
                backgroundColor: task.status === s ? STATUS_CONFIG[s].color : 'transparent',
                borderColor: task.status === s ? STATUS_CONFIG[s].color : 'transparent',
              }}
              onClick={() => { if (task.status !== s) onStatusChange(task.id, s) }}
            >
              {STATUS_CONFIG[s].label}
            </Button>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 筛选栏 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <FilterOutlined style={{ color: '#64748b', fontSize: 14 }} />
        <Select
          mode="multiple"
          allowClear
          placeholder="状态筛选"
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ minWidth: 200 }}
          size="small"
          options={[
            { value: 'blocked', label: '🚫 阻塞' },
            { value: 'pending', label: '📌 待办' },
            { value: 'in_progress', label: '🔄 进行中' },
            { value: 'completed', label: '✅ 已完成' },
          ]}
        />
        <Select
          mode="multiple"
          allowClear
          placeholder="优先级筛选"
          value={priorityFilter}
          onChange={setPriorityFilter}
          style={{ minWidth: 160 }}
          size="small"
          options={[
            { value: 'P0', label: 'P0 紧急' },
            { value: 'P1', label: 'P1 高' },
            { value: 'P2', label: 'P2 中' },
            { value: 'P3', label: 'P3 低' },
          ]}
        />
        <Tag style={{ margin: 0, color: '#64748b', border: 'none', background: '#f1f5f9', fontSize: 12 }}>
          共 {filteredTasks.length} 项
        </Tag>
      </div>

      {/* 看板列 */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          paddingBottom: 8,
        }}
      >
      {COLUMNS.map((category) => {
        const categoryCfg = CATEGORY_CONFIG[category]
        const columnTasks = filteredTasks
          .filter((t) => t.category === category)
          .sort((a, b) => {
            const statusOrder = ['blocked', 'pending', 'in_progress', 'completed']
            const sd = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
            if (sd !== 0) return sd
            const priOrder = ['P0', 'P1', 'P2', 'P3']
            return priOrder.indexOf(a.priority) - priOrder.indexOf(b.priority)
          })

        return (
          <div
            key={category}
            style={{
              flex: '1 0 280px',
              minWidth: 280,
              maxWidth: 360,
              background: '#f8fafc',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Column Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
                padding: '8px 10px',
                borderRadius: 8,
                backgroundColor: CATEGORY_BG[category],
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{categoryCfg.icon}</span>
                <Text strong style={{ fontSize: 14, color: categoryCfg.color }}>
                  {categoryCfg.label}
                </Text>
              </div>
              <Badge
                count={columnTasks.length}
                style={{
                  backgroundColor: categoryCfg.color,
                  fontSize: 11,
                  boxShadow: 'none',
                }}
              />
            </div>

            {/* Cards */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 360px)' }}>
              {columnTasks.length === 0 ? (
                <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                  暂无任务
                </Text>
              ) : (
                columnTasks.map((task) => renderCard(task))
              )}
            </div>

            {/* 底部添加按钮 */}
            <Button
              type="text"
              block
              size="small"
              icon={<PlusOutlined />}
              onClick={() => onAddTask(category)}
              style={{ marginTop: 10, color: '#94a3b8', borderRadius: 8, height: 36 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = categoryCfg.color; e.currentTarget.style.background = `${categoryCfg.color}08` }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent' }}
            >
              添加任务
            </Button>
          </div>
        )
      })}
      </div>
    </div>
  )
}

export default BoardView
