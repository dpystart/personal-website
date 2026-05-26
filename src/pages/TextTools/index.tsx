import { useState } from 'react'
import { Typography, Tabs } from 'antd'
import BatchString from './BatchString'
import Base64Tool from './Base64Tool'
import TimestampTool from './TimestampTool'
import JsonYamlTool from './JsonYamlTool'

const { Title } = Typography

export default function TextTools() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Title level={4} style={{ margin: '0 0 16px' }}>文本工具</Title>
      <Tabs
        defaultActiveKey="batch"
        items={[
          { key: 'batch', label: '批量处理', children: <BatchString /> },
          { key: 'base64', label: 'Base64', children: <Base64Tool /> },
          { key: 'timestamp', label: '时间戳', children: <TimestampTool /> },
          { key: 'json-yaml', label: 'JSON/YAML', children: <JsonYamlTool /> },
        ]}
        style={{ flex: 1 }}
      />
    </div>
  )
}
