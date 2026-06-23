export type CommandCategory = 'k8s' | 'docker' | 'network' | 'storage' | 'system' | 'monitor' | 'other'

export interface Command {
  id: string
  title: string
  command: string
  description?: string
  category: CommandCategory
  tags: string[]
  createdAt: string
  updatedAt: string
}

export const CATEGORY_OPTIONS: { key: CommandCategory; label: string; icon: string }[] = [
  { key: 'k8s', label: 'K8S', icon: '☸️' },
  { key: 'docker', label: 'Docker', icon: '🐳' },
  { key: 'network', label: '网络', icon: '🌐' },
  { key: 'storage', label: '存储', icon: '💾' },
  { key: 'system', label: '系统', icon: '🖥️' },
  { key: 'monitor', label: '监控', icon: '📊' },
  { key: 'other', label: '其他', icon: '📋' },
]
