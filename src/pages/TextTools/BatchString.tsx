import { useState } from 'react'
import { Input, Button, Space, Typography, message, Divider, Select } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import { copyToClipboard } from '../../utils/clipboard'

const { TextArea } = Input
const { Text } = Typography

export default function BatchString() {
  const [input, setInput] = useState('')
  const [template, setTemplate] = useState("'{item}',")
  const [output, setOutput] = useState('')
  const [separator, setSeparator] = useState('newline')

  const process = () => {
    const sep = separator === 'newline' ? '\n' : separator === 'comma' ? ',' : separator === 'space' ? ' ' : separator
    const lines = input.split(sep).map(s => s.trim()).filter(Boolean)
    const result = lines.map((item, index) => {
      return template
        .replace(/\{item\}/g, item)
        .replace(/\{index\}/g, String(index))
        .replace(/\{index1\}/g, String(index + 1))
    })
    setOutput(result.join('\n'))
  }

  const copyOutput = () => {
    if (output) {
      copyToClipboard(output)
      message.success('已复制')
    }
  }

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <div>
          <Text strong>输入文本</Text>
          <Text type="secondary" style={{ marginLeft: 8 }}>每行一个或使用分隔符分割</Text>
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入需要处理的文本，每行一个..."
            autoSize={{ minRows: 5, maxRows: 12 }}
            style={{ marginTop: 8 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Text strong>模板表达式</Text>
            <Text type="secondary" style={{ marginLeft: 8 }}>
              可用变量: {'{item}'} {'{index}'} {'{index1}'}
            </Text>
            <Input
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="例如: '{item}',"
              style={{ marginTop: 8 }}
            />
          </div>
          <div>
            <Text strong>分隔符</Text>
            <Select
              value={separator}
              onChange={setSeparator}
              style={{ width: 120, marginTop: 8, display: 'block' }}
              options={[
                { value: 'newline', label: '换行符' },
                { value: 'comma', label: '逗号' },
                { value: 'space', label: '空格' },
              ]}
            />
          </div>
          <Button type="primary" onClick={process}>生成</Button>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text strong>输出结果</Text>
            <Button size="small" icon={<CopyOutlined />} onClick={copyOutput}>复制</Button>
          </div>
          <TextArea
            value={output}
            readOnly
            autoSize={{ minRows: 5, maxRows: 12 }}
            placeholder="处理结果将显示在此..."
          />
        </div>
      </Space>
    </div>
  )
}
