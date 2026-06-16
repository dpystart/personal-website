import { useState, useEffect, useCallback } from 'react'
import { Typography, Button, Input, Space, Tag, Modal, Select, message, Empty, Spin, Popconfirm, Segmented, theme, Tooltip, Breadcrumb, Pagination } from 'antd'
import { copyToClipboard } from '../../utils/clipboard'
import {
  PlusOutlined, SearchOutlined, DeleteOutlined,
  CopyOutlined, ReloadOutlined, CodeOutlined,
  FolderOutlined, FolderAddOutlined,
} from '@ant-design/icons'
import Editor from '@monaco-editor/react'

const { Title, Text, Paragraph } = Typography

const API_BASE = '/api/scripts'

interface TreeNode {
  key: string
  title: string
  isLeaf: boolean
  children?: TreeNode[]
  size?: number
  modifiedAt?: string
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

function getNodesAtPath(tree: TreeNode[], pathSegments: string[]): TreeNode[] {
  if (pathSegments.length === 0) return tree
  let current = tree
  for (const seg of pathSegments) {
    const dir = current.find(n => !n.isLeaf && n.title === seg)
    if (dir && dir.children) {
      current = dir.children
    } else {
      return []
    }
  }
  return current
}

function countFiles(nodes: TreeNode[]): number {
  let count = 0
  for (const n of nodes) {
    if (n.isLeaf) count++
    else if (n.children) count += countFiles(n.children)
  }
  return count
}

export default function Scripts() {
  const [trees, setTrees] = useState<Record<string, TreeNode[]>>({})
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')

  // 当前路径导航
  const [currentPath, setCurrentPath] = useState<string[]>([])
  // 分页
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // 查看
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingFile, setViewingFile] = useState<{ name: string; category: string; path: string } | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [fileDescription, setFileDescription] = useState('')
  const [fileLoading, setFileLoading] = useState(false)

  // 新建文件
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newFilepath, setNewFilepath] = useState('')
  const [newCategory, setNewCategory] = useState('shell')
  const [newContent, setNewContent] = useState('')

  // 新建目录
  const [mkdirModalOpen, setMkdirModalOpen] = useState(false)
  const [newDirpath, setNewDirpath] = useState('')
  const [newDirCategory, setNewDirCategory] = useState('shell')

  const { token } = theme.useToken()
  const isDark = token.colorBgContainer !== '#ffffff'
  const editorTheme = isDark ? 'vs-dark' : 'vs'

  const fetchScripts = useCallback(async () => {
    try {
      const res = await fetch(API_BASE)
      if (res.ok) {
        const data = await res.json()
        setTrees(data.trees)
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

  // 当切换分类时重置路径和页码
  useEffect(() => { setCurrentPath([]); setCurrentPage(1) }, [activeCategory])
  // 当路径或搜索变化时重置页码
  useEffect(() => { setCurrentPage(1) }, [currentPath, search])

  // 获取当前要显示的节点列表
  const getCurrentNodes = (): { category: string; nodes: TreeNode[] }[] => {
    if (activeCategory === 'all') {
      return categories.map(cat => ({
        category: cat,
        nodes: getNodesAtPath(trees[cat] || [], currentPath),
      }))
    }
    return [{ category: activeCategory, nodes: getNodesAtPath(trees[activeCategory] || [], currentPath) }]
  }

  const allDisplayItems = getCurrentNodes()

  // 搜索过滤（递归搜索所有层级文件）
  const flattenForSearch = (nodes: TreeNode[], category: string): { node: TreeNode; category: string }[] => {
    const result: { node: TreeNode; category: string }[] = []
    for (const n of nodes) {
      if (n.isLeaf) result.push({ node: n, category })
      else if (n.children) result.push({ node: n, category }, ...flattenForSearch(n.children, category))
    }
    return result
  }

  const getFilteredItems = () => {
    if (!search) {
      const items: { node: TreeNode; category: string }[] = []
      for (const group of allDisplayItems) {
        for (const n of group.nodes) {
          items.push({ node: n, category: group.category })
        }
      }
      // 目录在前，文件在后
      items.sort((a, b) => {
        if (!a.node.isLeaf && b.node.isLeaf) return -1
        if (a.node.isLeaf && !b.node.isLeaf) return 1
        return 0
      })
      return items
    }
    const lower = search.toLowerCase()
    const all: { node: TreeNode; category: string }[] = []
    if (activeCategory === 'all') {
      for (const cat of categories) {
        all.push(...flattenForSearch(trees[cat] || [], cat))
      }
    } else {
      all.push(...flattenForSearch(trees[activeCategory] || [], activeCategory))
    }
    return all.filter(({ node }) =>
      node.title.toLowerCase().includes(lower) ||
      (node.description || '').toLowerCase().includes(lower)
    )
  }

  const filteredItems = getFilteredItems()
  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const openFile = async (category: string, node: TreeNode) => {
    setViewingFile({ name: node.title, category, path: node.key })
    setFileLoading(true)
    setViewModalOpen(true)
    setFileDescription(node.description || '')

    try {
      const res = await fetch(`${API_BASE}/${category}/${encodeURIComponent(node.key)}`)
      if (res.ok) {
        const data = await res.json()
        setFileContent(data.content)
      } else {
        message.error('读取文件失败')
      }
    } catch {
      message.error('读取文件失败')
    } finally {
      setFileLoading(false)
    }
  }

  const deleteItem = async (category: string, filepath: string) => {
    try {
      const res = await fetch(`${API_BASE}/${category}/${encodeURIComponent(filepath)}`, { method: 'DELETE' })
      if (res.ok) {
        message.success('已删除')
        fetchScripts()
      } else {
        const data = await res.json()
        message.error(data.error || '删除失败')
      }
    } catch {
      message.error('删除失败')
    }
  }

  const copyCode = async (category: string, filepath: string) => {
    try {
      const res = await fetch(`${API_BASE}/${category}/${encodeURIComponent(filepath)}`)
      if (res.ok) {
        const data = await res.json()
        copyToClipboard(data.content)
        message.success('已复制')
      }
    } catch {
      message.error('复制失败')
    }
  }

  const createFile = async () => {
    if (!newFilepath.trim()) {
      message.warning('请输入文件路径')
      return
    }
    const fullPath = currentPath.length > 0 ? `${currentPath.join('/')}/${newFilepath}` : newFilepath
    try {
      const res = await fetch(`${API_BASE}/${newCategory}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filepath: fullPath, content: newContent }),
      })
      if (res.ok) {
        message.success('创建成功')
        setCreateModalOpen(false)
        setNewFilepath('')
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

  const createDir = async () => {
    if (!newDirpath.trim()) {
      message.warning('请输入目录名称')
      return
    }
    const fullPath = currentPath.length > 0 ? `${currentPath.join('/')}/${newDirpath}` : newDirpath
    try {
      const res = await fetch(`${API_BASE}/${newDirCategory}/mkdir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dirpath: fullPath }),
      })
      if (res.ok) {
        message.success('目录创建成功')
        setMkdirModalOpen(false)
        setNewDirpath('')
        fetchScripts()
      } else {
        const data = await res.json()
        message.error(data.error || '创建失败')
      }
    } catch {
      message.error('创建失败')
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
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>新建文件</Button>
          <Button icon={<FolderAddOutlined />} onClick={() => setMkdirModalOpen(true)}>新建目录</Button>
        </Space>
      </div>

      {/* 分类 */}
      <div style={{ marginBottom: 20 }}>
        <Segmented
          value={activeCategory}
          onChange={(v) => setActiveCategory(v as string)}
          options={[
            { label: `全部`, value: 'all' },
            ...categories.map(cat => ({ label: cat, value: cat })),
          ]}
        />
      </div>

      {/* 面包屑导航 */}
      {currentPath.length > 0 && !search && (
        <div style={{ marginBottom: 16 }}>
          <Breadcrumb
            items={[
              { title: <a onClick={() => setCurrentPath([])}>根目录</a> },
              ...currentPath.map((seg, idx) => ({
                title: idx < currentPath.length - 1
                  ? <a onClick={() => setCurrentPath(currentPath.slice(0, idx + 1))}>{seg}</a>
                  : seg,
              })),
            ]}
          />
        </div>
      )}

      {/* 列表 */}
      {filteredItems.length === 0 ? (
        <Empty description={search ? '没有匹配的文件' : '该目录下暂无内容'} style={{ marginTop: 80 }} />
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {paginatedItems.map(({ node, category }) => (
              <div
                key={`${category}/${node.key}`}
                onClick={() => {
                  if (node.isLeaf) {
                    openFile(category, node)
                  } else {
                    setCurrentPath([...currentPath, node.title])
                  }
                }}
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
                    {node.isLeaf ? (
                      <CodeOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
                    ) : (
                      <FolderOutlined style={{ color: token.colorWarning, fontSize: 16 }} />
                    )}
                    <Text strong style={{ fontSize: 15 }}>{node.title}</Text>
                    {activeCategory === 'all' && (
                      <Tag
                        color={category === 'shell' ? 'blue' : 'green'}
                        style={{ marginLeft: 4 }}
                      >
                        {category}
                      </Tag>
                    )}
                    {!node.isLeaf && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {countFiles(node.children || [])} 个文件
                      </Text>
                    )}
                  </div>
                  {node.isLeaf && node.description && (
                    <Paragraph
                      type="secondary"
                      ellipsis={{ rows: 1 }}
                      style={{ margin: '0 0 0 26px', fontSize: 13 }}
                    >
                      {node.description}
                    </Paragraph>
                  )}
                  {node.isLeaf && (
                    <div style={{ marginLeft: 26, marginTop: 4 }}>
                      <Space size={16}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{formatSize(node.size || 0)}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{node.modifiedAt ? formatTime(node.modifiedAt) : ''}</Text>
                      </Space>
                    </div>
                  )}
                </div>

                {/* 右侧操作 */}
                <Space size={4} onClick={(e) => e.stopPropagation()}>
                  {node.isLeaf && (
                    <Tooltip title="复制代码">
                      <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copyCode(category, node.key)} />
                    </Tooltip>
                  )}
                  <Popconfirm
                    title={node.isLeaf ? '确定删除该文件？' : '确定删除该目录及其所有内容？'}
                    onConfirm={() => deleteItem(category, node.key)}
                    okText="删除"
                    cancelText="取消"
                  >
                    <Tooltip title="删除">
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0', borderTop: `1px solid rgba(0,0,0,0.04)` }}>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={filteredItems.length}
              onChange={(page) => setCurrentPage(page)}
              showTotal={(total) => `共 ${total} 项`}
              size="small"
            />
          </div>
        </div>
      )}

      {/* 查看弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CodeOutlined style={{ color: token.colorPrimary }} />
            <span>{viewingFile?.name}</span>
            <Tag color={viewingFile?.category === 'shell' ? 'blue' : 'green'}>{viewingFile?.category}</Tag>
          </div>
        }
        open={viewModalOpen}
        onCancel={() => setViewModalOpen(false)}
        footer={<Button onClick={() => setViewModalOpen(false)}>关闭</Button>}
        width={1100}
        centered
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
                language={viewingFile ? getLanguage(viewingFile.name) : 'shell'}
                value={fileContent}
                theme={editorTheme}
                options={{
                  readOnly: true,
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

      {/* 新建文件弹窗 */}
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
            value={newFilepath}
            onChange={(e) => setNewFilepath(e.target.value)}
            placeholder={currentPath.length > 0 ? `文件名，如 start.sh（当前目录：${currentPath.join('/')}）` : '文件名，如 deploy.sh 或 deploy/start.sh'}
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
            language={getLanguage(newFilepath || '.sh')}
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

      {/* 新建目录弹窗 */}
      <Modal
        title="新建目录"
        open={mkdirModalOpen}
        onCancel={() => setMkdirModalOpen(false)}
        onOk={createDir}
        okText="创建"
        cancelText="取消"
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <Select
            value={newDirCategory}
            onChange={setNewDirCategory}
            style={{ width: 140 }}
            options={categories.map(c => ({ value: c, label: c }))}
          />
          <Input
            value={newDirpath}
            onChange={(e) => setNewDirpath(e.target.value)}
            placeholder={currentPath.length > 0 ? `目录名（当前目录：${currentPath.join('/')}）` : '目录名，如 deploy'}
            style={{ flex: 1 }}
          />
        </div>
      </Modal>
    </div>
  )
}
