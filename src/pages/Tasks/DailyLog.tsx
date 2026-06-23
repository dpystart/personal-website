import React, { useState } from 'react'
import { Input, Select, Button, Popconfirm, Typography, Tag } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import type { WorkLog, Task } from './types'
import { CATEGORY_CONFIG } from './types'

const { Text } = Typography

interface DailyLogProps {
  logs: WorkLog[]
  tasks: Task[]
  onAdd: (content: string, taskId?: string) => void
  onDelete: (id: string) => void
}

const DailyLog: React.FC<DailyLogProps> = ({ logs, tasks, onAdd, onDelete }) => {
  const [content, setContent] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(undefined)
  const [hoveredLogId, setHoveredLogId] = useState<string | null>(null)

  const handleSubmit = () => {
    const trimmed = content.trim()
    if (!trimmed) return
    onAdd(trimmed, selectedTaskId)
    setContent('')
    setSelectedTaskId(undefined)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const activeTasks = tasks.filter((t) => t.status !== 'completed')

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const getTaskById = (taskId: string) => tasks.find((t) => t.id === taskId)

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
          📝 今日工作记录
        </div>
        <Text type="secondary" style={{ fontSize: 13 }}>
          快速记录，周报自动汇总
        </Text>
      </div>

      {/* Input Row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <Input
          placeholder="记录你正在做的事..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ flex: 1 }}
        />
        <Select
          placeholder="关联任务(可选)"
          value={selectedTaskId}
          onChange={(value) => setSelectedTaskId(value)}
          allowClear
          style={{ width: 200 }}
          options={activeTasks.map((task) => ({
            label: `[${CATEGORY_CONFIG[task.category].label}] ${task.title}`,
            value: task.id,
          }))}
        />
        <Button type="primary" onClick={handleSubmit} disabled={!content.trim()}>
          记录
        </Button>
      </div>

      {/* Log List */}
      <div>
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            暂无记录，开始记录你的工作吧
          </div>
        ) : (
          logs.map((log) => {
            const linkedTask = log.taskId ? getTaskById(log.taskId) : null
            return (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: 6,
                  marginBottom: 8,
                  background: hoveredLogId === log.id ? '#fafafa' : 'transparent',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={() => setHoveredLogId(log.id)}
                onMouseLeave={() => setHoveredLogId(null)}
              >
                {/* Time */}
                <Text
                  type="secondary"
                  style={{
                    fontSize: 13,
                    fontFamily: 'monospace',
                    marginRight: 12,
                    flexShrink: 0,
                  }}
                >
                  {formatTime(log.createdAt)}
                </Text>

                {/* Content */}
                <span style={{ flex: 1, fontSize: 14 }}>{log.content}</span>

                {/* Linked Task Tag */}
                {linkedTask && (
                  <Tag
                    color={CATEGORY_CONFIG[linkedTask.category].color}
                    style={{ marginLeft: 8, marginRight: 8, flexShrink: 0 }}
                  >
                    {linkedTask.title}
                  </Tag>
                )}

                {/* Delete Button */}
                <Popconfirm
                  title="确定删除这条记录？"
                  onConfirm={() => onDelete(log.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    style={{
                      opacity: hoveredLogId === log.id ? 1 : 0,
                      transition: 'opacity 0.2s',
                      flexShrink: 0,
                    }}
                  />
                </Popconfirm>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default DailyLog
