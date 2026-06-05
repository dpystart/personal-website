import { Typography, Tabs } from 'antd'
import TextDiffTab from './TextDiffTab'
import PrometheusLabelTool from './PrometheusLabelTool'
import BatchString from './BatchString'
import Base64Tool from './Base64Tool'
import TimestampTool from './TimestampTool'
import JsonYamlTool from './JsonYamlTool'

const { Title } = Typography

export default function TextTools() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Title level={4} style={{ margin: '0 0 8px' }}>文本工具</Title>
      <Tabs
        defaultActiveKey="diff"
        className="text-tools-tabs"
        items={[
          { key: 'diff', label: '文本对比', children: <TextDiffTab /> },
          { key: 'prom-label', label: '标签格式化', children: <PrometheusLabelTool /> },
          { key: 'batch', label: '批量处理', children: <BatchString /> },
          { key: 'base64', label: 'Base64', children: <Base64Tool /> },
          { key: 'timestamp', label: '时间戳', children: <TimestampTool /> },
          { key: 'json-yaml', label: 'JSON/YAML', children: <JsonYamlTool /> },
        ]}
        style={{ flex: 1, minHeight: 0 }}
      />
    </div>
  )
}
