import { lazy, Suspense } from 'react'
import { Typography, Tabs, Spin } from 'antd'
import PrometheusLabelTool from './PrometheusLabelTool'
import OcrTool from './OcrTool'
import BatchString from './BatchString'
import CrontabTool from './CrontabTool'
import Base64Tool from './Base64Tool'
import TimestampTool from './TimestampTool'
import JsonYamlTool from './JsonYamlTool'

const TextDiffTab = lazy(() => import('./TextDiffTab'))

const { Title } = Typography

const LazyDiff = () => (
  <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}><Spin tip="加载编辑器..." /></div>}>
    <TextDiffTab />
  </Suspense>
)

export default function TextTools() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Title level={4} style={{ margin: '0 0 8px' }}>文本工具</Title>
      <Tabs
        defaultActiveKey="diff"
        className="text-tools-tabs"
        items={[
          { key: 'diff', label: '文本对比', children: <LazyDiff /> },
          { key: 'prom-label', label: '标签格式化', children: <PrometheusLabelTool /> },
          { key: 'ocr', label: '图片转文字', children: <OcrTool /> },
          { key: 'batch', label: '批量处理', children: <BatchString /> },
          { key: 'crontab', label: 'Crontab', children: <CrontabTool /> },
          { key: 'base64', label: 'Base64', children: <Base64Tool /> },
          { key: 'timestamp', label: '时间戳', children: <TimestampTool /> },
          { key: 'json-yaml', label: 'JSON/YAML', children: <JsonYamlTool /> },
        ]}
        style={{ flex: 1, minHeight: 0 }}
      />
    </div>
  )
}
