import React, { useEffect } from 'react'
import { Modal, Form, Input, Select } from 'antd'
import type { Command } from './types'
import { CATEGORY_OPTIONS } from './types'

interface CommandFormModalProps {
  open: boolean
  command?: Command
  onClose: () => void
  onSubmit: (cmd: Partial<Command>) => void
}

const CommandFormModal: React.FC<CommandFormModalProps> = ({ open, command, onClose, onSubmit }) => {
  const [form] = Form.useForm()
  const isEditing = !!command

  useEffect(() => {
    if (open) {
      if (command) {
        form.setFieldsValue({
          title: command.title,
          command: command.command,
          category: command.category,
          description: command.description || '',
          tags: command.tags || [],
        })
      } else {
        form.resetFields()
      }
    }
  }, [open, command, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      onSubmit(values)
    } catch {
      // validation failed
    }
  }

  return (
    <Modal
      title={isEditing ? '编辑命令' : '新建命令'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      width={680}
      centered
      okText="确定"
      cancelText="取消"
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="title"
          label="标题"
          rules={[{ required: true, message: '请输入命令标题' }]}
        >
          <Input placeholder="命令标题，如：查看Pod状态" />
        </Form.Item>

        <Form.Item
          name="command"
          label="命令"
          rules={[{ required: true, message: '请输入命令' }]}
        >
          <Input.TextArea
            placeholder="输入命令，如：kubectl get pods -A"
            autoSize={{ minRows: 3, maxRows: 8 }}
            style={{
              fontFamily: 'Monaco, Menlo, Consolas, "Courier New", monospace',
              background: '#1e293b',
              color: '#e2e8f0',
              borderColor: '#334155',
            }}
          />
        </Form.Item>

        <Form.Item
          name="category"
          label="分类"
          rules={[{ required: true, message: '请选择分类' }]}
        >
          <Select placeholder="选择分类">
            {CATEGORY_OPTIONS.map((opt) => (
              <Select.Option key={opt.key} value={opt.key}>
                {opt.icon} {opt.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="description" label="说明">
          <Input.TextArea
            placeholder="命令说明（可选）"
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
        </Form.Item>

        <Form.Item name="tags" label="标签">
          <Select
            mode="tags"
            placeholder="添加标签，回车确认"
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default CommandFormModal
