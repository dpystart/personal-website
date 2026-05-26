import { useState, useEffect } from 'react'
import { Input, Button, Space, Typography, message, Select, Card, Divider } from 'antd'
import { CopyOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { copyToClipboard } from '../../utils/clipboard'

const { Text } = Typography

const formats = [
  { value: 'YYYY-MM-DD HH:mm:ss', label: 'YYYY-MM-DD HH:mm:ss' },
  { value: 'YYYY/MM/DD HH:mm:ss', label: 'YYYY/MM/DD HH:mm:ss' },
  { value: 'DD/MM/YYYY HH:mm:ss', label: 'DD/MM/YYYY HH:mm:ss' },
  { value: 'YYYY-MM-DDTHH:mm:ssZ', label: 'ISO 8601' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'HH:mm:ss', label: 'HH:mm:ss' },
]

export default function TimestampTool() {
  const [timestamp, setTimestamp] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [format, setFormat] = useState('YYYY-MM-DD HH:mm:ss')
  const [currentTs, setCurrentTs] = useState(Math.floor(Date.now() / 1000))
  const [unit, setUnit] = useState<'s' | 'ms'>('s')

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTs(Math.floor(Date.now() / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const tsToDate = () => {
    const ts = Number(timestamp)
    if (isNaN(ts)) {
      message.error('请输入有效的时间戳')
      return
    }
    const ms = unit === 's' ? ts * 1000 : ts
    setDateStr(dayjs(ms).format(format))
  }

  const dateToTs = () => {
    const d = dayjs(dateStr)
    if (!d.isValid()) {
      message.error('请输入有效的日期时间')
      return
    }
    setTimestamp(String(unit === 's' ? d.unix() : d.valueOf()))
  }

  const useNow = () => {
    const now = unit === 's' ? Math.floor(Date.now() / 1000) : Date.now()
    setTimestamp(String(now))
    setDateStr(dayjs().format(format))
  }

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16, background: 'var(--ant-color-fill-alter)' }}>
        <Space>
          <Text>当前时间戳：</Text>
          <Text strong copyable>{currentTs}</Text>
          <Text type="secondary">({dayjs(currentTs * 1000).format('YYYY-MM-DD HH:mm:ss')})</Text>
        </Space>
      </Card>

      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <Text strong>精度</Text>
            <Select
              value={unit}
              onChange={setUnit}
              style={{ width: 100, marginTop: 8, display: 'block' }}
              options={[
                { value: 's', label: '秒 (s)' },
                { value: 'ms', label: '毫秒 (ms)' },
              ]}
            />
          </div>
          <div>
            <Text strong>日期格式</Text>
            <Select
              value={format}
              onChange={setFormat}
              style={{ width: 220, marginTop: 8, display: 'block' }}
              options={formats}
            />
          </div>
          <Button icon={<ReloadOutlined />} onClick={useNow}>当前时间</Button>
        </div>

        <Divider style={{ margin: '4px 0' }} />

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong>时间戳</Text>
              <Button size="small" icon={<CopyOutlined />} onClick={() => { copyToClipboard(timestamp); message.success('已复制') }}>复制</Button>
            </div>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                placeholder={unit === 's' ? '如: 1716700000' : '如: 1716700000000'}
              />
              <Button type="primary" onClick={tsToDate}>→ 转日期</Button>
            </Space.Compact>
          </div>

          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text strong>日期时间</Text>
              <Button size="small" icon={<CopyOutlined />} onClick={() => { copyToClipboard(dateStr); message.success('已复制') }}>复制</Button>
            </div>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                placeholder="如: 2024-05-26 12:00:00"
              />
              <Button type="primary" onClick={dateToTs}>→ 转时间戳</Button>
            </Space.Compact>
          </div>
        </div>
      </Space>
    </div>
  )
}
