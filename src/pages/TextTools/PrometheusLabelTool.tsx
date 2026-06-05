import { useState } from 'react'
import { Input, Button, Space, Typography, message } from 'antd'
import { CopyOutlined, ClearOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { copyToClipboard } from '../../utils/clipboard'

const { TextArea } = Input
const { Text } = Typography

const KNOWN_TLDS = ['_io_', '_com_', '_cn_', '_org_', '_net_']
const FILTER_KEYS = new Set(['container', 'job', 'node', 'instance', 'endpoint', 'namespace', 'pod', 'service', '__name__'])

function restoreLabelName(raw: string, customPrefixes: string[]): string {
  if (!raw.includes('_')) return raw

  for (const tld of KNOWN_TLDS) {
    const tldIdx = raw.indexOf(tld)
    if (tldIdx === -1) continue
    const tldSuffix = tld.slice(1, -1) // e.g. 'io'
    const domainPart = raw.substring(0, tldIdx).replace(/_/g, '.') + '.' + tldSuffix
    const namePart = raw.substring(tldIdx + tld.length)
    if (namePart) {
      return domainPart + '/' + namePart.replace(/_/g, '-')
    }
    return domainPart
  }

  for (const prefix of customPrefixes) {
    if (raw.startsWith(prefix + '_')) {
      const rest = raw.substring(prefix.length + 1)
      return prefix + '/' + rest.replace(/_/g, '-')
    }
  }

  return raw.replace(/_/g, '-')
}

function parsePrometheusLabels(input: string, customPrefixes: string[]): string {
  let content = input.trim()

  const braceMatch = content.match(/\{([\s\S]*)\}/)
  if (braceMatch) {
    content = braceMatch[1]
  }

  const pairs: Array<{ key: string; value: string }> = []
  const regex = /(\w+)="((?:[^"\\]|\\.)*)"/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    pairs.push({ key: match[1], value: match[2] })
  }

  const labels: Array<{ key: string; value: string }> = []

  for (const { key, value } of pairs) {
    if (FILTER_KEYS.has(key)) continue
    if (!key.startsWith('label_')) continue
    const raw = key.substring(6) // remove 'label_'
    const restored = restoreLabelName(raw, customPrefixes)
    labels.push({ key: restored, value })
  }

  labels.push({ key: 'node-role.kubernetes.io/worker', value: '' })

  labels.sort((a, b) => a.key.localeCompare(b.key))

  return labels.map(({ key, value }) => `${key}: ${value}`).join('\n')
}

export default function PrometheusLabelTool() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [prefixes, setPrefixes] = useState('xiaomi')

  const handleConvert = () => {
    if (!input.trim()) {
      message.warning('请输入 Prometheus 标签数据')
      return
    }
    const customPrefixes = prefixes.split(',').map(s => s.trim()).filter(Boolean)
    const result = parsePrometheusLabels(input, customPrefixes)
    setOutput(result)
  }

  const handleClear = () => {
    setInput('')
    setOutput('')
  }

  const copyOutput = () => {
    if (output) {
      copyToClipboard(output)
      message.success('已复制')
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <Text strong>Prometheus 标签数据</Text>
        <TextArea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='粘贴 kube_node_labels{...} 或 {...} 内容...'
          autoSize={{ minRows: 4, maxRows: 8 }}
          style={{ marginTop: 8 }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleConvert}>转换</Button>
        <Button icon={<ClearOutlined />} onClick={handleClear}>清空</Button>
        <Text type="secondary" style={{ marginLeft: 8 }}>自定义前缀：</Text>
        <Input
          value={prefixes}
          onChange={(e) => setPrefixes(e.target.value)}
          placeholder="逗号分隔，如 xiaomi,miks"
          style={{ width: 200 }}
          size="small"
        />
      </div>

      <div style={{ flex: 1, minHeight: 150, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text strong>K8s 原生标签（可编辑）</Text>
          <Button size="small" icon={<CopyOutlined />} onClick={copyOutput}>复制</Button>
        </div>
        <TextArea
          value={output}
          onChange={(e) => setOutput(e.target.value)}
          placeholder="转换结果将显示在此..."
          style={{ flex: 1, resize: 'none' }}
        />
      </div>
    </div>
  )
}
