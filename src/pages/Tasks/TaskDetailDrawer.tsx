import React, { useState, useEffect } from 'react'
import { Modal, Typography, Tag, Progress, Button, Empty, Input, Radio, DatePicker } from 'antd'
import { EditOutlined, ClockCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Task, WorkLog, TaskCategory, TaskPriority } from './types'
import { CATEGORY_CONFIG, STATUS_CONFIG, PRIORITY_CONFIG } from './types'

const { Text, Title } = Typography

interface TaskDetailDrawerProps {
  task: Task | null
  logs: WorkLog[]
  open: boolean
  onClose: () => void
  onEdit: (task: Task) => void
}

const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({ task, logs, open, onClose, onEdit }) => {
  const [mode, setMode] = useState<'detail' | 'edit'>('detail')
  const [category, setCategory] = useState<TaskCategory>('cluster')
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('P1')
  const [dueDate, setDueDate] = useState<dayjs.Dayjs | null>(null)
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (open && task) {
      setMode('detail')
      setCategory(task.category)
      setTitle(task.title)
      setPriority(task.priority)
      setDueDate(task.dueDate ? dayjs(task.dueDate) : null)
      setDescription(task.description || '')
    }
  }, [open, task])

  if (!task) return null

  const categoryCfg = CATEGORY_CONFIG[task.category]
  const statusCfg = STATUS_CONFIG[task.status]
  const priorityCfg = PRIORITY_CONFIG[task.priority]
  const relatedLogs = logs.filter(l => l.taskId === task.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const handleSave = () => {
    onEdit({ ...task, category, title, priority, dueDate: dueDate ? dueDate.format('YYYY-MM-DD') : undefined, description: description || undefined } as Task)
    onClose()
  }

  return (
    <Modal
      title={mode === 'detail' ? '任务详情' : '编辑任务'}
      open={open}
      onCancel={() => { onClose(); setMode('detail') }}
      footer={mode === 'detail' ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={() => setMode('edit')} icon={<EditOutlined />}>编辑</Button>
          <Button onClick={() => { onClose(); setMode('detail') }}>关闭</Button>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={() => setMode('detail')}>返回详情</Button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => setMode('detail')}>取消</Button>
            <Button type="primary" onClick={handleSave}>保存</Button>
          </div>
        </div>
      )}
      width={680}
      centered
      destroyOnClose
      styles={{ body: { padding: '24px' } }}
    >
      {mode === 'detail' ? (
        <div>
          {/* 头部 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 12 }}>
              <Title level={5} style={{ margin: 0 }}>{task.title}</Title>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Tag style={{ color: categoryCfg.color, background: `${categoryCfg.color}15`, border: 'none', borderRadius: 4 }}>
                {categoryCfg.icon} {categoryCfg.label}
              </Tag>
              <Tag style={{ color: statusCfg.color, background: `${statusCfg.color}15`, border: 'none', borderRadius: 4 }}>
                {statusCfg.label}
              </Tag>
              <Tag style={{ color: priorityCfg.color, background: priorityCfg.bg, border: 'none', borderRadius: 4 }}>
                {priorityCfg.label}
              </Tag>
            </div>
          </div>

          {/* 详情信息 */}
          <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {task.dueDate && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <Text type="secondary">截止日期</Text>
                <Text>{task.dueDate}</Text>
              </div>
            )}
            {task.progress > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <Text type="secondary">进度</Text>
                  <Text>{task.progress}%</Text>
                </div>
                <Progress percent={task.progress} size="small" strokeColor={{ from: '#3b82f6', to: '#6366f1' }} />
              </div>
            )}
            {task.description && (
              <div>
                <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>描述</Text>
                <div style={{ fontSize: 13, padding: '8px 12px', background: '#f8fafc', borderRadius: 6, color: '#374151' }}>
                  {task.description}
                </div>
              </div>
            )}
          </div>

          {/* 关联工作记录 */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <ClockCircleOutlined style={{ color: '#64748b' }} />
              <Text strong style={{ fontSize: 14 }}>工作记录</Text>
              <Tag style={{ margin: 0, background: '#f1f5f9', border: 'none', color: '#64748b', fontSize: 11 }}>
                {relatedLogs.length}
              </Tag>
            </div>

            {relatedLogs.length === 0 ? (
              <Empty description="暂无关联记录" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '16px 0' }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 240, overflowY: 'auto' }}>
                {relatedLogs.map((log, idx) => {
                  const time = new Date(log.createdAt)
                  const timeStr = `${time.getMonth() + 1}/${time.getDate()} ${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`
                  return (
                    <div key={log.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: idx < relatedLogs.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 12 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', marginTop: 4 }} />
                        {idx < relatedLogs.length - 1 && <div style={{ width: 1, flex: 1, background: '#e2e8f0', marginTop: 4 }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: '#1e293b', display: 'block' }}>{log.content}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{timeStr}</Text>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 编辑模式 */
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* 分类 */}
            <div>
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>分类</Text>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {(Object.keys(CATEGORY_CONFIG) as TaskCategory[]).map((key) => {
                  const cfg = CATEGORY_CONFIG[key]
                  const selected = category === key
                  return (
                    <div
                      key={key}
                      onClick={() => setCategory(key)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: `1.5px solid ${selected ? cfg.color : '#e5e7eb'}`,
                        background: selected ? `${cfg.color}10` : '#fff',
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: 12,
                        color: selected ? cfg.color : '#64748b',
                        fontWeight: selected ? 500 : 400,
                        transition: 'all 0.15s',
                      }}
                    >
                      {cfg.icon} {cfg.label}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 标题 */}
            <div>
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>标题</Text>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {/* 优先级 + 截止日期 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>优先级</Text>
                <Radio.Group value={priority} onChange={(e) => setPriority(e.target.value)} size="small">
                  {(['P0', 'P1', 'P2', 'P3'] as TaskPriority[]).map(p => (
                    <Radio.Button key={p} value={p} style={{ color: PRIORITY_CONFIG[p].color }}>{p}</Radio.Button>
                  ))}
                </Radio.Group>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>截止日期</Text>
                <DatePicker value={dueDate} onChange={setDueDate} style={{ width: '100%' }} size="small" />
              </div>
            </div>

            {/* 描述 */}
            <div>
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>描述</Text>
              <Input.TextArea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>

          </div>
        </div>
      )}
    </Modal>
  )
}

export default TaskDetailDrawer
