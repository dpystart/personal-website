import { useState, useEffect, useCallback } from 'react'
import { Typography, Button, Input, Space, Tag, Modal, Select, message, Empty, Spin, Popconfirm, Segmented, theme, Tooltip } from 'antd'
import { copyToClipboard } from '../../utils/clipboard'
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  CopyOutlined, FileTextOutlined, ReloadOutlined, CodeOutlined,
} from '@ant-design/icons'
import Editor from '@monaco-editor/react'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const API_BASE = '/api/scripts'

interface ScriptFile {
  name: string
  category: string
  path: string
  size: number
  modifiedAt: string
  description?: string
}

const LANG_MAP: Record<string, string> = {
  '.sh': 'shell',
  '.bash': 'shell',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.py': 'python',
  '.js': 'javascript',
  '.ts': 'typescript',
  '.json': 'json',
  '.conf': 'ini',
  '.cfg': 'ini',
  '.ini': 'ini',
  '.xml': 'xml',
}

function getLanguage(filename: string): string {
  const ext = '.' + filename.split('.').pop()?.toLowerCase()
  return LANG_MAP[ext] || 'shell'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// 从脚本内容的头部注释提取描述
function extractDescription(content: string): string {
  const lines = content.split('\n')
  const descLines: string[] = []

  for (let i = 0; i < lines.length && i < 10; i++) {
    const line = lines[i].trim()
    // 跳过 shebang
    if (i === 0 && line.startsWith('#!')) continue
    // 跳过空行（开头的）
    if (descLines.length === 0 && line === '') continue
    // 收集注释行
    if (line.startsWith('#') || line.startsWith('//')) {
      descLines.push(line.replace(/^[#/]+\s*/, ''))
    } else if (line.startsWith('---')) {
      // YAML 文件头
      continue
    } else if (line.startsWith('- name:')) {
      // ansible playbook 的 name 字段
      descLines.push(line.replace(/^- name:\s*/, ''))
      break
    } else {
      break
    }
  }
  return descLines.join(' ').trim()
}

export default function Scripts() {
  const [scripts, setScripts] = useState<ScriptFile[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')

  // 查看/编辑
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editingFile, setEditingFile] = useState<{ name: string; category: string } | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [fileDescription, setFileDescription] = useState('')
  const [fileLoading, setFileLoading] = useState(false)

  // 新建
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newFilename, setNewFilename] = useState('')
  const [newCategory, setNewCategory] = useState('shell')
  const [newContent, setNewContent] = useState('')

  const { token } = theme.useToken()
  const isDark = token.colorBgContainer !== '#ffffff'
  const editorTheme = isDark ? 'vs-dark' : 'vs'

  const fetchScripts = useCallback(async () => {
    try {
      const res = await fetch(API_BASE)
      if (res.ok) {
        const data = await res.json()
        // 逐个获取描述信息
        const scriptsWithDesc = await Promise.all(
          data.scripts.map(async (s: ScriptFile) => {
            try {
              const r = await fetch(`${API_BASE}/${s.category}/${encodeURIComponent(s.name)}`)
              if (r.ok) {
                const d = await r.json()
                return { ...s, description: extractDescription(d.content) }
              }
            } catch {}
            return s
          })
        )
        setScripts(scriptsWithDesc)
        setCategories(data.categories)
      } else {
        message.error('获取脚本列表失败')
      }
    } catch {
      message.error('无法连接后端服务')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchScripts() }, [fetchScripts])

  const filteredScripts = scripts.filter(s => {
    const matchSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(search.toLowerCase())
    const matchCategory = activeCategory === 'all' || s.category === activeCategory
    return matchSearch && matchCategory
  })

  const openFile = async (script: ScriptFile) => {
    setEditingFile({ name: script.name, category: script.category })
    setFileLoading(true)
    setViewModalOpen(true)

    try {
      const res = await fetch(`${API_BASE}/${script.category}/${encodeURIComponent(script.name)}`)
      if (res.ok) {
        const data = await res.json()
        setFileContent(data.content)
        setFileDescription(extractDescription(data.content))
      } else {
        message.error('读取文件失败')
      }
    } catch {
      message.error('读取文件失败')
    } finally {
      setFileLoading(false)
    }
  }

  const saveFile = async () => {
    if (!editingFile) return
    try {
      const res = await fetch(`${API_BASE}/${editingFile.category}/${encodeURIComponent(editingFile.name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fileContent }),
      })
      if (res.ok) {
        message.success('保存成功')
        setViewModalOpen(false)
        fetchScripts()
      } else {
        const data = await res.json()
        message.error(data.error || '保存失败')
      }
    } catch {
      message.error('保存失败')
    }
  }

  const createFile = async () => {
    if (!newFilename.trim()) {
      message.warning('请输入文件名')
      return
    }
    try {
      const res = await fetch(`${API_BASE}/${newCategory}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: newFilename, content: newContent }),
      })
      if (res.ok) {
        message.success('创建成功')
        setCreateModalOpen(false)
        setNewFilename('')
        setNewContent('')
        fetchScripts()
      } else {
        const data = await res.json()
        message.error(data.error || '创建失败')
      }
    } catch {
      message.error('创建失败')
    }
  }

  const deleteFile = async (script: ScriptFile) => {
    try {
      const res = await fetch(`${API_BASE}/${script.category}/${encodeURIComponent(script.name)}`, { method: 'DELETE' })
      if (res.ok) {
        message.success('已删除')
        fetchScripts()
      } else {
        message.error('删除失败')
      }
    } catch {
      message.error('删除失败')
    }
  }

  const copyCode = async (script: ScriptFile) => {
    try {
      const res = await fetch(`${API_BASE}/${script.category}/${encodeURIComponent(script.name)}`)
      if (res.ok) {
        const data = await res.json()
        copyToClipboard(data.content)
        message.success('已复制')
      }
    } catch {
      message.error('复制失败')
    }
  }

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>脚本管理</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>管理服务器上的 Shell 和 Ansible 脚本</Text>
        </div>
        <Space>
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索文件名或描述..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 220 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => { setLoading(true); fetchScripts() }}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>新建</Button>
        </Space>
      </div>

      {/* 分类 */}
      <div style={{ marginBottom: 20 }}>
        <Segmented
          value={activeCategory}
          onChange={(v) => setActiveCategory(v as string)}
          options={[
            { label: `全部 (${scripts.length})`, value: 'all' },
            ...categories.map(cat => ({
              label: `${cat} (${scripts.filter(s => s.category === cat).length})`,
              value: cat,
            })),
          ]}
        />
      </div>

      {/* 列表 */}
      {filteredScripts.length === 0 ? (
        <Empty description={search ? '没有匹配的文件' : '该目录下暂无脚本'} style={{ marginTop: 80 }} />
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredScripts.map(script => (
              <div
                key={script.path}
                onClick={() => openFile(script)}
                style={{
                  padding: '16px 20px',
                  borderRadius: 12,
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                  e.currentTarget.style.borderColor = token.colorPrimary
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'
                  e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
                }}
              >
                {/* 左侧信息 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <CodeOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
                    <Text strong style={{ fontSize: 15 }}>{script.name}</Text>
                    <Tag
                      color={script.category === 'shell' ? 'blue' : 'green'}
                      style={{ marginLeft: 4 }}
                    >
                      {script.category}
                    </Tag>
                  </div>
                  {script.description && (
                    <Paragraph
                      type="secondary"
                      ellipsis={{ rows: 1 }}
                      style={{ margin: '0 0 0 26px', fontSize: 13 }}
                    >
                      {script.description}
                    </Paragraph>
                  )}
                  <div style={{ marginLeft: 26, marginTop: 4 }}>
                    <Space size={16}>
                      <Text type="secondary" style={{ fontSize: 12 }}>{formatSize(script.size)}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{formatTime(script.modifiedAt)}</Text>
                    </Space>
                  </div>
                </div>

                {/* 右侧操作 */}
                <Space size={4} onClick={(e) => e.stopPropagation()}>
                  <Tooltip title="复制代码">
                    <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copyCode(script)} />
                  </Tooltip>
                  <Tooltip title="编辑">
                    <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openFile(script)} />
                  </Tooltip>
                  <Popconfirm title="确定删除该文件？" onConfirm={() => deleteFile(script)} okText="删除" cancelText="取消">
                    <Tooltip title="删除">
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 查看/编辑弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CodeOutlined style={{ color: token.colorPrimary }} />
            <span>{editingFile?.name}</span>
            <Tag color={editingFile?.category === 'shell' ? 'blue' : 'green'}>{editingFile?.category}</Tag>
          </div>
        }
        open={viewModalOpen}
        onCancel={() => setViewModalOpen(false)}
        onOk={saveFile}
        width={1100}
        okText="保存"
        cancelText="关闭"
        styles={{ body: { padding: '16px 0', maxHeight: '75vh', overflow: 'auto' } }}
      >
        {fileLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : (
          <div>
            {fileDescription && (
              <div style={{
                padding: '10px 16px',
                marginBottom: 12,
                borderRadius: 8,
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                borderLeft: `3px solid ${token.colorPrimary}`,
              }}>
                <Text type="secondary" style={{ fontSize: 13 }}>{fileDescription}</Text>
              </div>
            )}
            <div style={{
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
              borderRadius: 10,
              overflow: 'hidden',
            }}>
              <Editor
                height={780}
                language={editingFile ? getLanguage(editingFile.name) : 'shell'}
                value={fileContent}
                onChange={(v) => {
                  setFileContent(v || '')
                  setFileDescription(extractDescription(v || ''))
                }}
                theme={editorTheme}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  padding: { top: 16, bottom: 16 },
                  lineNumbersMinChars: 3,
                }}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* 新建弹窗 */}
      <Modal
        title="新建脚本"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={createFile}
        width={900}
        okText="创建"
        cancelText="取消"
      >
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <Select
            value={newCategory}
            onChange={setNewCategory}
            style={{ width: 140 }}
            options={categories.map(c => ({ value: c, label: c }))}
          />
          <Input
            value={newFilename}
            onChange={(e) => setNewFilename(e.target.value)}
            placeholder="文件名，如 deploy.sh"
            style={{ flex: 1 }}
          />
        </div>
        <div style={{
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          <Editor
            height={400}
            language={getLanguage(newFilename || '.sh')}
            value={newContent}
            onChange={(v) => setNewContent(v || '')}
            theme={editorTheme}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
            }}
          />
        </div>
      </Modal>
    </div>
  )
}
