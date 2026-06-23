export type TaskCategory = 'cluster' | 'fault' | 'alert' | 'delivery' | 'other'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked'
export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3'

export interface Task {
  id: string
  title: string
  category: TaskCategory
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string
  progress: number
  description?: string
  tags: string[]
  todayFocus: boolean
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface WorkLog {
  id: string
  taskId?: string
  content: string
  createdAt: string
}

export interface SavedReport {
  id: string
  scope: 'weekly' | 'monthly'
  rangeStart: string
  rangeEnd: string
  markdown: string
  createdAt: string
}

export const CATEGORY_CONFIG: Record<TaskCategory, { label: string; icon: string; color: string }> = {
  cluster: { label: '集群变更', icon: '🔧', color: '#3b82f6' },
  fault: { label: '故障报修', icon: '🚨', color: '#ef4444' },
  alert: { label: '告警处理', icon: '🔔', color: '#f97316' },
  delivery: { label: '主机交付', icon: '🖥️', color: '#8b5cf6' },
  other: { label: '其他', icon: '📋', color: '#64748b' },
}

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  pending: { label: '待办', color: '#64748b' },
  in_progress: { label: '进行中', color: '#f59e0b' },
  completed: { label: '已完成', color: '#10b981' },
  blocked: { label: '阻塞', color: '#ef4444' },
}

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  P0: { label: 'P0', color: '#dc2626', bg: '#fef2f2' },
  P1: { label: 'P1', color: '#f97316', bg: '#fff7ed' },
  P2: { label: 'P2', color: '#eab308', bg: '#fefce8' },
  P3: { label: 'P3', color: '#6366f1', bg: '#eef2ff' },
}
