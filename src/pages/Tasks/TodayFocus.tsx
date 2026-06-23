import React from 'react'
import { Card, Tag, Typography } from 'antd'
import { WarningOutlined } from '@ant-design/icons'
import type { Task } from './types'
import { CATEGORY_CONFIG, PRIORITY_CONFIG } from './types'

const { Text, Title } = Typography

interface TodayFocusProps {
  tasks: Task[]
  onToggle: (id: string) => void
}

const TodayFocus: React.FC<TodayFocusProps> = ({ tasks, onToggle }) => {
  const today = new Date().toISOString().slice(0, 10)

  const urgentTasks = tasks.filter((t) => {
    if (t.status === 'completed') return false
    if (t.status === 'blocked') return true
    if (t.priority === 'P0') return true
    if (t.dueDate && t.dueDate <= today) return true
    return false
  })

  if (urgentTasks.length === 0) return null

  return (
    <Card
      style={{
        borderRadius: 12,
        border: '1px solid #fecaca',
        background: 'linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%)',
        boxShadow: '0 1px 3px rgba(239,68,68,0.08)',
      }}
      bodyStyle={{ padding: '14px 20px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <WarningOutlined style={{ color: '#ef4444', fontSize: 16 }} />
        <Title level={5} style={{ margin: 0, fontSize: 15, color: '#dc2626' }}>
          紧急待处理
        </Title>
        <Tag color="red" style={{ marginLeft: 4, borderRadius: 10, fontSize: 11 }}>{urgentTasks.length}</Tag>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {urgentTasks.map((task) => {
          const categoryCfg = CATEGORY_CONFIG[task.category]
          const priorityCfg = PRIORITY_CONFIG[task.priority]
          const isOverdue = task.dueDate && task.dueDate < today

          return (
            <div
              key={task.id}
              onClick={() => onToggle(task.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                background: '#fff',
                borderRadius: 8,
                border: '1px solid #fecaca',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(239,68,68,0.12)' }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}
            >
              <Tag
                style={{
                  color: priorityCfg.color,
                  backgroundColor: priorityCfg.bg,
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 11,
                  margin: 0,
                  padding: '0 5px',
                  lineHeight: '18px',
                }}
              >
                {priorityCfg.label}
              </Tag>
              <Text style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
                {task.title}
              </Text>
              <Tag
                style={{
                  color: categoryCfg.color,
                  background: `${categoryCfg.color}15`,
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 11,
                  margin: 0,
                  padding: '0 5px',
                  lineHeight: '18px',
                }}
              >
                {categoryCfg.label}
              </Tag>
              {task.status === 'blocked' && (
                <Tag color="red" style={{ margin: 0, fontSize: 11, borderRadius: 4, lineHeight: '18px' }}>阻塞</Tag>
              )}
              {isOverdue && (
                <Tag color="volcano" style={{ margin: 0, fontSize: 11, borderRadius: 4, lineHeight: '18px' }}>逾期</Tag>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default TodayFocus
