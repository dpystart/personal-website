import { useState } from 'react'
import { Input, Button, Space, Typography, message, Radio } from 'antd'
import { CopyOutlined, SwapOutlined } from '@ant-design/icons'
import { copyToClipboard } from '../../utils/clipboard'

const { TextArea } = Input
const { Text } = Typography

export default function Base64Tool() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')

  const handleConvert = () => {
    try {
      if (mode === 'encode') {
        const encoded = btoa(unescape(encodeURIComponent(input)))
        setOutput(encoded)
      } else {
        const decoded = decodeURIComponent(escape(atob(input.trim())))
        setOutput(decoded)
      }
    } catch {
      message.error(mode === 'encode' ? '编码失败' : '解码失败，请检查输入是否为有效的 Base64')
    }
  }

  const handleInputChange = (value: string) => {
    setInput(value)
    try {
      if (mode === 'encode') {
        setOutput(btoa(unescape(encodeURIComponent(value))))
      } else {
        setOutput(decodeURIComponent(escape(atob(value.trim()))))
      }
    } catch {
      // ignore
    }
  }

  const copyOutput = () => {
    if (output) {
      copyToClipboard(output)
      message.success('已复制')
    }
  }

  const swap = () => {
    setInput(output)
    setOutput(input)
    setMode(mode === 'encode' ? 'decode' : 'encode')
  }

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Radio.Group value={mode} onChange={(e) => { setMode(e.target.value); setOutput('') }}>
            <Radio.Button value="encode">编码</Radio.Button>
            <Radio.Button value="decode">解码</Radio.Button>
          </Radio.Group>
          <Button icon={<SwapOutlined />} onClick={swap} size="small">交换</Button>
        </div>

        <div>
          <Text strong>{mode === 'encode' ? '原始文本' : 'Base64 字符串'}</Text>
          <TextArea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={mode === 'encode' ? '输入需要编码的文本...' : '输入需要解码的 Base64 字符串...'}
            autoSize={{ minRows: 6, maxRows: 12 }}
            style={{ marginTop: 8 }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text strong>{mode === 'encode' ? 'Base64 结果' : '解码结果'}</Text>
            <Button size="small" icon={<CopyOutlined />} onClick={copyOutput}>复制</Button>
          </div>
          <TextArea
            value={output}
            readOnly
            autoSize={{ minRows: 6, maxRows: 12 }}
            placeholder="结果将显示在此..."
          />
        </div>
      </Space>
    </div>
  )
}
