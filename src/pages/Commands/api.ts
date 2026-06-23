import type { Command } from './types'

const BASE = '/api/commands'

export async function fetchCommands(params?: { q?: string; category?: string }): Promise<Command[]> {
  const query = new URLSearchParams()
  if (params?.q) query.set('q', params.q)
  if (params?.category) query.set('category', params.category)
  const url = query.toString() ? `${BASE}?${query}` : BASE
  const res = await fetch(url)
  if (!res.ok) throw new Error('获取命令失败')
  const data = await res.json()
  return data.commands
}

export async function createCommand(cmd: Partial<Command>): Promise<Command> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  })
  if (!res.ok) throw new Error('创建命令失败')
  return res.json()
}

export async function updateCommand(id: string, updates: Partial<Command>): Promise<Command> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('更新命令失败')
  return res.json()
}

export async function deleteCommand(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除命令失败')
}
