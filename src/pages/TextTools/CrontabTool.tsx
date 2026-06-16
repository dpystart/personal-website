import { useState, useMemo } from 'react'
import { Typography, Input, Select, Card, Space, Tag, Divider, Button, message } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import cronstrue from 'cronstrue/i18n'
import { CronExpressionParser } from 'cron-parser'
import { copyToClipboard } from '../../utils/clipboard'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: String(i) }))
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({ value: String(i), label: String(i) }))
const DOM_OPTIONS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))
const MONTH_OPTIONS = [
  { value: '1', label: '1月' }, { value: '2', label: '2月' }, { value: '3', label: '3月' },
  { value: '4', label: '4月' }, { value: '5', label: '5月' }, { value: '6', label: '6月' },
  { value: '7', label: '7月' }, { value: '8', label: '8月' }, { value: '9', label: '9月' },
  { value: '10', label: '10月' }, { value: '11', label: '11月' }, { value: '12', label: '12月' },
]
const DOW_OPTIONS = [
  { value: '0', label: '周日' }, { value: '1', label: '周一' }, { value: '2', label: '周二' },
  { value: '3', label: '周三' }, { value: '4', label: '周四' }, { value: '5', label: '周五' },
  { value: '6', label: '周六' },
]

interface FieldConfig {
  type: 'every' | 'specific' | 'range' | 'step'
  values: string[]
  rangeStart: string
  rangeEnd: string
  step: string
}

const defaultField = (): FieldConfig => ({
  type: 'every',
  values: [],
  rangeStart: '0',
  rangeEnd: '0',
  step: '1',
})

const PRESETS = [
  { label: '每分钟', cron: '* * * * *' },
  { label: '每小时', cron: '0 * * * *' },
  { label: '每天零点', cron: '0 0 * * *' },
  { label: '每天 8:00', cron: '0 8 * * *' },
  { label: '每周一 9:00', cron: '0 9 * * 1' },
  { label: '每月1号零点', cron: '0 0 1 * *' },
  { label: '工作日 9:00', cron: '0 9 * * 1-5' },
  { label: '每5分钟', cron: '*/5 * * * *' },
  { label: '每30分钟', cron: '*/30 * * * *' },
]

function fieldToExpression(field: FieldConfig): string {
  switch (field.type) {
    case 'every': return '*'
    case 'specific': return field.values.length > 0 ? field.values.join(',') : '*'
    case 'range': return `${field.rangeStart}-${field.rangeEnd}`
    case 'step': return `*/${field.step}`
  }
}

export default function CrontabTool() {
  const [cronStr, setCronStr] = useState('* * * * *')
  const [fields, setFields] = useState<FieldConfig[]>([
    defaultField(), defaultField(), defaultField(), defaultField(), defaultField(),
  ])

  const fieldLabels = ['分钟', '小时', '日', '月', '星期']
  const fieldOptions = [MINUTE_OPTIONS, HOUR_OPTIONS, DOM_OPTIONS, MONTH_OPTIONS, DOW_OPTIONS]

  const updateField = (index: number, update: Partial<FieldConfig>) => {
    const newFields = [...fields]
    newFields[index] = { ...newFields[index], ...update }
    setFields(newFields)
    const newCron = newFields.map(fieldToExpression).join(' ')
    setCronStr(newCron)
  }

  const handleCronInput = (value: string) => {
    setCronStr(value)
  }

  const applyPreset = (cron: string) => {
    setCronStr(cron)
    const parts = cron.split(' ')
    const newFields = parts.map((part) => {
      if (part === '*') return defaultField()
      if (part.includes('/')) return { ...defaultField(), type: 'step' as const, step: part.split('/')[1] }
      if (part.includes('-')) {
        const [start, end] = part.split('-')
        return { ...defaultField(), type: 'range' as const, rangeStart: start, rangeEnd: end }
      }
      return { ...defaultField(), type: 'specific' as const, values: part.split(',') }
    })
    setFields(newFields)
  }

  const description = useMemo(() => {
    try {
      return cronstrue.toString(cronStr, { locale: 'zh_CN' })
    } catch {
      return '无效的 Cron 表达式'
    }
  }, [cronStr])

  const nextRuns = useMemo(() => {
    try {
      const cron = CronExpressionParser.parse(cronStr)
      const runs: string[] = []
      for (let i = 0; i < 8; i++) {
        const next = cron.next()
        runs.push(dayjs(next.toDate()).format('YYYY-MM-DD HH:mm:ss (ddd)'))
      }
      return runs
    } catch {
      return []
    }
  }, [cronStr])

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>Crontab 生成器</Title>
        <Button
          icon={<CopyOutlined />}
          onClick={() => { copyToClipboard(cronStr); message.success('已复制') }}
        >
          复制表达式
        </Button>
      </div>

      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Text strong>Cron 表达式：</Text>
          <Input
            value={cronStr}
            onChange={(e) => handleCronInput(e.target.value)}
            style={{ width: 300, fontFamily: 'monospace', fontSize: 16 }}
          />
          <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>{description}</Tag>
        </div>
      </Card>

      <div style={{ marginBottom: 16 }}>
        <Text strong>快捷选择：</Text>
        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <Button key={p.cron} size="small" onClick={() => applyPreset(p.cron)}>{p.label}</Button>
          ))}
        </div>
      </div>

      <Divider />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        {fields.map((field, i) => (
          <Card key={i} size="small" title={fieldLabels[i]}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Select
                value={field.type}
                onChange={(type) => updateField(i, { type })}
                style={{ width: '100%' }}
                options={[
                  { value: 'every', label: '每' + fieldLabels[i] },
                  { value: 'specific', label: '指定' + fieldLabels[i] },
                  { value: 'range', label: '范围' },
                  { value: 'step', label: '间隔' },
                ]}
              />
              {field.type === 'specific' && (
                <Select
                  mode="multiple"
                  value={field.values}
                  onChange={(values) => updateField(i, { values })}
                  options={fieldOptions[i]}
                  style={{ width: '100%' }}
                  placeholder="选择具体值"
                  maxTagCount="responsive"
                />
              )}
              {field.type === 'range' && (
                <Space>
                  <Select
                    value={field.rangeStart}
                    onChange={(rangeStart) => updateField(i, { rangeStart })}
                    options={fieldOptions[i]}
                    style={{ width: 100 }}
                  />
                  <Text>到</Text>
                  <Select
                    value={field.rangeEnd}
                    onChange={(rangeEnd) => updateField(i, { rangeEnd })}
                    options={fieldOptions[i]}
                    style={{ width: 100 }}
                  />
                </Space>
              )}
              {field.type === 'step' && (
                <Space>
                  <Text>每</Text>
                  <Input
                    value={field.step}
                    onChange={(e) => updateField(i, { step: e.target.value })}
                    style={{ width: 80 }}
                  />
                  <Text>{fieldLabels[i]}</Text>
                </Space>
              )}
            </Space>
          </Card>
        ))}
      </div>

      {nextRuns.length > 0 && (
        <Card title="未来执行时间" size="small">
          <Space direction="vertical">
            {nextRuns.map((run, i) => (
              <Text key={i}>
                <Text type="secondary">{i + 1}.</Text> {run}
              </Text>
            ))}
          </Space>
        </Card>
      )}
    </div>
  )
}
