import { useState } from 'react'
import { Input, Button, Space, Typography, message, Radio } from 'antd'
import { CopyOutlined, FormatPainterOutlined } from '@ant-design/icons'
import yaml from 'js-yaml'
import { copyToClipboard } from '../../utils/clipboard'

const { TextArea } = Input
const { Text } = Typography

type Mode = 'json2yaml' | 'yaml2json' | 'format-json' | 'compress-json'

export default function JsonYamlTool() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [mode, setMode] = useState<Mode>('json2yaml')

  const convert = () => {
    if (!input.trim()) return

    try {
      switch (mode) {
        case 'json2yaml': {
          const obj = JSON.parse(input)
          setOutput(yaml.dump(obj, { indent: 2 }))
          break
        }
        case 'yaml2json': {
          const obj = yaml.load(input)
          setOutput(JSON.stringify(obj, null, 2))
          break
        }
        case 'format-json': {
          const obj = JSON.parse(input)
          setOutput(JSON.stringify(obj, null, 2))
          break
        }
        case 'compress-json': {
          const obj = JSON.parse(input)
          setOutput(JSON.stringify(obj))
          break
        }
      }
    } catch (e: any) {
      message.error(`转换失败: ${e.message}`)
    }
  }

  const handleInputChange = (value: string) => {
    setInput(value)
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
        <Radio.Group value={mode} onChange={(e) => { setMode(e.target.value); setOutput('') }} buttonStyle="solid">
          <Radio.Button value="json2yaml">JSON → YAML</Radio.Button>
          <Radio.Button value="yaml2json">YAML → JSON</Radio.Button>
          <Radio.Button value="format-json">JSON 格式化</Radio.Button>
          <Radio.Button value="compress-json">JSON 压缩</Radio.Button>
        </Radio.Group>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              输入 ({mode.startsWith('yaml') ? 'YAML' : 'JSON'})
            </Text>
            <TextArea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={mode.startsWith('yaml') ? '输入 YAML 内容...' : '输入 JSON 内容...'}
              autoSize={{ minRows: 12, maxRows: 20 }}
              style={{ fontFamily: 'monospace' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
            <Button type="primary" icon={<FormatPainterOutlined />} onClick={convert}>
              转换
            </Button>
          </div>

          <div style={{ flex: 1, minWidth: 300 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong>
                输出 ({mode === 'json2yaml' ? 'YAML' : 'JSON'})
              </Text>
              <Button size="small" icon={<CopyOutlined />} onClick={copyOutput}>复制</Button>
            </div>
            <TextArea
              value={output}
              readOnly
              autoSize={{ minRows: 12, maxRows: 20 }}
              placeholder="转换结果将显示在此..."
              style={{ fontFamily: 'monospace' }}
            />
          </div>
        </div>
      </Space>
    </div>
  )
}
