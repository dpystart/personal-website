import React from 'react'
import { Card, Button, Tag, Popconfirm, Typography } from 'antd'
import { CopyOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { Command } from './types'
import { CATEGORY_OPTIONS } from './types'

const { Text } = Typography

interface CommandCardProps {
  command: Command
  keyword?: string
  onCopy: () => void
  onEdit: () => void
  onDelete: () => void
}

function highlightText(text: string, keyword?: string): React.ReactNode {
  if (!keyword || !text) return text
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedKeyword})`, 'gi')
  const parts = text.split(regex)
  if (parts.length === 1) return text
  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            style={{ background: '#fef08a', padding: '0 1px', borderRadius: 2 }}
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  )
}

const CommandCard: React.FC<CommandCardProps> = ({
  command,
  keyword,
  onCopy,
  onEdit,
  onDelete,
}) => {
  const categoryOption = CATEGORY_OPTIONS.find((c) => c.key === command.category)

  return (
    <Card
      style={{
        borderRadius: 10,
        border: '1px solid #f0f0f0',
        height: 220,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      bodyStyle={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* Top row: title + actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          {categoryOption && (
            <span style={{ fontSize: 14 }}>{categoryOption.icon}</span>
          )}
          <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {highlightText(command.title, keyword)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <Button type="primary" size="small" icon={<CopyOutlined />} onClick={onCopy} style={{ fontSize: 12, height: 24, padding: '0 8px' }}>
            复制
          </Button>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={onEdit} style={{ width: 24, height: 24, padding: 0 }} />
          <Popconfirm
            title="确定删除？"
            onConfirm={onDelete}
            okText="删除"
            cancelText="取消"
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} style={{ width: 24, height: 24, padding: 0 }} />
          </Popconfirm>
        </div>
      </div>

      {/* Middle: command code block */}
      <div
        style={{
          background: '#1e293b',
          color: '#e2e8f0',
          fontFamily: 'Monaco, Menlo, Consolas, "Courier New", monospace',
          padding: '10px 12px',
          borderRadius: 6,
          fontSize: 12,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          flex: 1,
          minHeight: 48,
          maxHeight: 100,
          overflowY: 'auto',
          marginBottom: 8,
        }}
      >
        {highlightText(command.command, keyword)}
      </div>

      {/* Bottom: description + tags */}
      <div style={{ marginTop: 'auto' }}>
        {command.description && (
          <Text style={{ color: '#8c8c8c', fontSize: 12, display: 'block', marginBottom: 4 }} ellipsis>
            {highlightText(command.description, keyword)}
          </Text>
        )}
        {command.tags && command.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {command.tags.map((tag) => (
              <Tag key={tag} style={{ margin: 0, fontSize: 11, lineHeight: '18px', padding: '0 5px' }}>
                {tag}
              </Tag>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

export default CommandCard
