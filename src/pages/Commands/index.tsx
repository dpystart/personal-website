import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Input, Button, Segmented, message, Spin, Empty, Typography, Pagination } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { Command, CommandCategory } from './types'
import { CATEGORY_OPTIONS } from './types'
import { fetchCommands, createCommand, updateCommand, deleteCommand } from './api'
import CommandCard from './CommandCard'
import CommandFormModal from './CommandFormModal'
import { copyToClipboard } from '../../utils/clipboard'

const { Title } = Typography

const categorySegmentOptions = [
  { label: '全部', value: '' },
  ...CATEGORY_OPTIONS.map((opt) => ({ label: `${opt.icon} ${opt.label}`, value: opt.key })),
]

const Commands: React.FC = () => {
  const [commands, setCommands] = useState<Command[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCommand, setEditingCommand] = useState<Command | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadCommands = useCallback(async (q: string, category: string) => {
    setLoading(true)
    try {
      const data = await fetchCommands({
        q: q || undefined,
        category: category || undefined,
      })
      setCommands(data)
    } catch {
      setCommands([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCommands(search, categoryFilter)
  }, [search, categoryFilter, loadCommands])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      setSearch(value)
    }, 300)
  }

  const handleCategoryChange = (value: string | number) => {
    setCategoryFilter(value as string)
  }

  const handleCreate = async (cmd: Partial<Command>) => {
    try {
      const created = await createCommand(cmd)
      setCommands((prev) => [created, ...prev])
      setModalOpen(false)
      message.success('命令创建成功')
    } catch {
      message.error('创建失败')
    }
  }

  const handleUpdate = async (cmd: Partial<Command>) => {
    if (!editingCommand) return
    try {
      const updated = await updateCommand(editingCommand.id, cmd)
      setCommands((prev) =>
        prev.map((c) => (c.id === editingCommand.id ? updated : c))
      )
      setModalOpen(false)
      setEditingCommand(undefined)
      message.success('命令更新成功')
    } catch {
      message.error('更新失败')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCommand(id)
      setCommands((prev) => prev.filter((c) => c.id !== id))
      message.success('命令已删除')
    } catch {
      message.error('删除失败')
    }
  }

  const handleCopy = async (command: Command) => {
    try {
      await copyToClipboard(command.command)
      message.success('命令已复制')
    } catch {
      message.error('复制失败')
    }
  }

  const openCreate = () => {
    setEditingCommand(undefined)
    setModalOpen(true)
  }

  const openEdit = (command: Command) => {
    setEditingCommand(command)
    setModalOpen(true)
  }

  const handleModalSubmit = (cmd: Partial<Command>) => {
    if (editingCommand) {
      handleUpdate(cmd)
    } else {
      handleCreate(cmd)
    }
  }

  const paginatedCommands = commands.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>命令速查</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建命令</Button>
      </div>

      {/* Search + filter */}
      <div style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索命令、关键词..."
          allowClear
          size="middle"
          onChange={handleSearchChange}
          style={{ marginBottom: 12 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Segmented
            options={categorySegmentOptions}
            value={categoryFilter}
            onChange={handleCategoryChange}
            size="small"
          />
          {commands.length > 0 && (
            <span style={{ fontSize: 12, color: '#94a3b8' }}>共 {commands.length} 条</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Spin size="large" />
          </div>
        ) : commands.length === 0 ? (
          <Empty description="暂无命令" style={{ padding: '80px 0' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              创建第一条命令
            </Button>
          </Empty>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
              gap: 14,
              gridAutoRows: '220px',
            }}
          >
            {paginatedCommands.map((cmd) => (
              <CommandCard
                key={cmd.id}
                command={cmd}
                keyword={search}
                onCopy={() => handleCopy(cmd)}
                onEdit={() => openEdit(cmd)}
                onDelete={() => handleDelete(cmd.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {commands.length > pageSize && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={commands.length}
            onChange={(page) => setCurrentPage(page)}
            showTotal={(total) => `共 ${total} 条`}
            size="small"
          />
        </div>
      )}

      {/* Modal */}
      <CommandFormModal
        open={modalOpen}
        command={editingCommand}
        onClose={() => {
          setModalOpen(false)
          setEditingCommand(undefined)
        }}
        onSubmit={handleModalSubmit}
      />
    </div>
  )
}

export default Commands
