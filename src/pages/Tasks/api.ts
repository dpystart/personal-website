import type { Task, WorkLog, SavedReport } from './types'

const BASE = '/api/tasks'

export async function fetchTasks(params?: { category?: string; status?: string; from?: string; to?: string }): Promise<Task[]> {
  const query = new URLSearchParams()
  if (params?.category) query.set('category', params.category)
  if (params?.status) query.set('status', params.status)
  if (params?.from) query.set('from', params.from)
  if (params?.to) query.set('to', params.to)
  const url = query.toString() ? `${BASE}?${query}` : BASE
  const res = await fetch(url)
  if (!res.ok) throw new Error('获取任务失败')
  const data = await res.json()
  return data.tasks
}

export async function createTask(task: Partial<Task>): Promise<Task> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  })
  if (!res.ok) throw new Error('创建任务失败')
  return res.json()
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('更新任务失败')
  return res.json()
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除任务失败')
}

export async function fetchLogs(params?: { from?: string; to?: string }): Promise<WorkLog[]> {
  const query = new URLSearchParams()
  if (params?.from) query.set('from', params.from)
  if (params?.to) query.set('to', params.to)
  const url = query.toString() ? `${BASE}/logs?${query}` : `${BASE}/logs`
  const res = await fetch(url)
  if (!res.ok) throw new Error('获取记录失败')
  const data = await res.json()
  return data.logs
}

export async function createLog(log: { content: string; taskId?: string }): Promise<WorkLog> {
  const res = await fetch(`${BASE}/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(log),
  })
  if (!res.ok) throw new Error('创建记录失败')
  return res.json()
}

export async function deleteLog(id: string): Promise<void> {
  const res = await fetch(`${BASE}/logs/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除记录失败')
}

export async function fetchReports(): Promise<SavedReport[]> {
  const res = await fetch(`${BASE}/reports`)
  if (!res.ok) throw new Error('获取报告失败')
  const data = await res.json()
  return data.reports
}

export async function saveReport(report: Omit<SavedReport, 'id' | 'createdAt'>): Promise<SavedReport> {
  const res = await fetch(`${BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  })
  if (!res.ok) throw new Error('保存报告失败')
  return res.json()
}

export async function deleteReport(id: string): Promise<void> {
  const res = await fetch(`${BASE}/reports/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除报告失败')
}
