import React, { useState, useEffect } from 'react'
import { Modal, Input, Radio, DatePicker } from 'antd'
import dayjs from 'dayjs'
import type { Task, TaskCategory, TaskPriority } from './types'
import { CATEGORY_CONFIG, PRIORITY_CONFIG } from './types'

interface TaskFormModalProps {
  open: boolean
  task?: Task
  defaultCategory?: TaskCategory
  onClose: () => void
  onSubmit: (task: Partial<Task>) => void
}

const categoryKeys = Object.keys(CATEGORY_CONFIG) as TaskCategory[]
const priorityKeys = Object.keys(PRIORITY_CONFIG) as TaskPriority[]

const TaskFormModal: React.FC<TaskFormModalProps> = ({ open, task, defaultCategory, onClose, onSubmit }) => {
  const [category, setCategory] = useState<TaskCategory>('cluster')
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('P2')
  const [dueDate, setDueDate] = useState<dayjs.Dayjs | null>(null)
  const [description, setDescription] = useState('')

  const isEditing = !!task

  useEffect(() => {
    if (task) {
      setCategory(task.category)
      setTitle(task.title)
      setPriority(task.priority)
      setDueDate(task.dueDate ? dayjs(task.dueDate) : null)
      setDescription(task.description || '')
    } else {
      setCategory(defaultCategory || 'cluster')
      setTitle('')
      setPriority('P1')
      setDueDate(dayjs().add(3, 'day'))
      setDescription('')
    }
  }, [task, defaultCategory, open])

  const handleSubmit = () => {
    const values: Partial<Task> = {
      category,
      title,
      status: 'pending',
      priority,
      dueDate: dueDate ? dueDate.format('YYYY-MM-DD') : undefined,
      description: description || undefined,
    }
    onSubmit(values)
  }

  return (
    <Modal
      title={isEditing ? '编辑任务' : '新建任务'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="确定"
      cancelText="取消"
      width={680}
      centered
      destroyOnClose
      styles={{ body: { padding: '24px' } }}
    >
      {/* Category Selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>任务类别</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {categoryKeys.map((key) => {
            const config = CATEGORY_CONFIG[key]
            const isSelected = category === key
            return (
              <div
                key={key}
                onClick={() => setCategory(key)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: `2px solid ${isSelected ? config.color : '#e5e7eb'}`,
                  backgroundColor: isSelected ? `${config.color}10` : '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: 20 }}>{config.icon}</span>
                <span style={{ fontWeight: 500 }}>{config.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Title */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>标题</div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="请输入任务标题"
        />
      </div>

      {/* Priority */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>优先级</div>
        <Radio.Group value={priority} onChange={(e) => setPriority(e.target.value)}>
          {priorityKeys.map((key) => {
            const config = PRIORITY_CONFIG[key]
            return (
              <Radio.Button
                key={key}
                value={key}
                style={{
                  color: priority === key ? '#fff' : config.color,
                  backgroundColor: priority === key ? config.color : config.bg,
                  borderColor: config.color,
                  fontWeight: 600,
                }}
              >
                {config.label}
              </Radio.Button>
            )
          })}
        </Radio.Group>
      </div>

      {/* Due Date */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>截止日期</div>
        <DatePicker
          value={dueDate}
          onChange={(date) => setDueDate(date)}
          style={{ width: '100%' }}
          placeholder="选择截止日期"
        />
      </div>

      {/* Description */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>描述（可选）</div>
        <Input.TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="请输入任务描述"
          rows={3}
        />
      </div>

    </Modal>
  )
}

export default TaskFormModal
