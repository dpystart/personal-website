import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, Select, Button, Space, Typography, message } from 'antd'
import { CopyOutlined, DownloadOutlined, SaveOutlined, DeleteOutlined } from '@ant-design/icons'
import { fetchReports, saveReport, deleteReport } from './api'
import { copyToClipboard } from '../../utils/clipboard'
import type { Task, WorkLog, SavedReport, TaskCategory } from './types'
import { CATEGORY_CONFIG } from './types'

const { Title, Text } = Typography

interface ReportViewProps {
  tasks: Task[]
  logs: WorkLog[]
}

type ReportScope = 'weekly' | 'monthly'

interface PeriodOption {
  label: string
  value: string
  start: Date
  end: Date
}

/** Generate recent week options (last 8 weeks) */
function getWeekOptions(): PeriodOption[] {
  const options: PeriodOption[] = []
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() + diffToMonday)
  thisMonday.setHours(0, 0, 0, 0)

  for (let i = 0; i < 8; i++) {
    const monday = new Date(thisMonday)
    monday.setDate(thisMonday.getDate() - i * 7)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    const label = i === 0
      ? '本周'
      : i === 1
        ? '上周'
        : `${formatDate(monday)} ~ ${formatDate(sunday)}`
    options.push({
      label,
      value: `week-${i}`,
      start: monday,
      end: sunday,
    })
  }
  return options
}

/** Generate recent month options (last 6 months) */
function getMonthOptions(): PeriodOption[] {
  const options: PeriodOption[] = []
  const now = new Date()
  for (let i = 0; i < 6; i++) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)
    const label = i === 0
      ? '本月'
      : i === 1
        ? '上月'
        : `${start.getFullYear()}年${start.getMonth() + 1}月`
    options.push({
      label,
      value: `month-${i}`,
      start,
      end,
    })
  }
  return options
}

function formatDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function isInRange(dateStr: string, start: Date, end: Date): boolean {
  const d = new Date(dateStr)
  return d >= start && d <= end
}

/** Generate markdown report */
function generateReport(
  tasks: Task[],
  logs: WorkLog[],
  start: Date,
  end: Date,
  scope: ReportScope
): string {
  const periodLabel = scope === 'weekly'
    ? `周报 (${formatDate(start)} ~ ${formatDate(end)})`
    : `月报 (${formatDate(start)} ~ ${formatDate(end)})`

  const periodTasks = tasks.filter((t) =>
    isInRange(t.createdAt, start, end) || (t.completedAt && isInRange(t.completedAt, start, end))
  )
  const periodLogs = logs.filter((l) => isInRange(l.createdAt, start, end))

  const lines: string[] = []
  lines.push(`# ${periodLabel}`)
  lines.push('')
  lines.push('## 本期工作完成情况')
  lines.push('')

  const categories: TaskCategory[] = ['cluster', 'fault', 'alert', 'delivery']
  categories.forEach((cat) => {
    const catTasks = periodTasks.filter((t) => t.category === cat)
    if (catTasks.length === 0) return

    const completed = catTasks.filter((t) => t.status === 'completed')
    const inProgress = catTasks.filter((t) => t.status === 'in_progress')

    lines.push(`### ${CATEGORY_CONFIG[cat].icon} ${CATEGORY_CONFIG[cat].label}`)
    lines.push('')

    if (completed.length > 0) {
      lines.push('**已完成:**')
      completed.forEach((t) => {
        lines.push(`- [x] ${t.title}${t.priority !== 'P3' ? ` (${t.priority})` : ''}`)
      })
      lines.push('')
    }

    if (inProgress.length > 0) {
      lines.push('**进行中:**')
      inProgress.forEach((t) => {
        lines.push(`- [ ] ${t.title} — 进度 ${t.progress}%`)
      })
      lines.push('')
    }
  })

  // Work logs
  if (periodLogs.length > 0) {
    lines.push('## 工作日志摘要')
    lines.push('')
    periodLogs.forEach((log) => {
      const date = new Date(log.createdAt)
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`
      lines.push(`- **${dateStr}**: ${log.content}`)
    })
    lines.push('')
  }

  // Next period plan
  const pendingTasks = tasks.filter(
    (t) => t.status === 'pending' || t.status === 'in_progress'
  )
  if (pendingTasks.length > 0) {
    lines.push(scope === 'weekly' ? '## 下周计划' : '## 下月计划')
    lines.push('')
    pendingTasks.slice(0, 10).forEach((t) => {
      lines.push(`- ${CATEGORY_CONFIG[t.category].icon} ${t.title}${t.status === 'in_progress' ? ` (续, ${t.progress}%)` : ''}`)
    })
    lines.push('')
  }

  return lines.join('\n')
}

const ReportView: React.FC<ReportViewProps> = ({ tasks, logs }) => {
  const [scope, setScope] = useState<ReportScope>('weekly')
  const [periodValue, setPeriodValue] = useState<string>('week-0')
  const [markdown, setMarkdown] = useState<string>('')
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])
  const [loading, setLoading] = useState(false)

  const weekOptions = useMemo(() => getWeekOptions(), [])
  const monthOptions = useMemo(() => getMonthOptions(), [])
  const periodOptions = scope === 'weekly' ? weekOptions : monthOptions

  // Load saved reports
  useEffect(() => {
    fetchReports().then(setSavedReports).catch(() => {})
  }, [])

  // Reset period selection when scope changes
  useEffect(() => {
    setPeriodValue(scope === 'weekly' ? 'week-0' : 'month-0')
    setMarkdown('')
  }, [scope])

  const handleGenerate = useCallback(() => {
    const selected = periodOptions.find((o) => o.value === periodValue)
    if (!selected) return
    const report = generateReport(tasks, logs, selected.start, selected.end, scope)
    setMarkdown(report)
  }, [tasks, logs, scope, periodValue, periodOptions])

  const handleCopyMarkdown = useCallback(async () => {
    if (!markdown) return
    await copyToClipboard(markdown)
    message.success('Markdown 已复制')
  }, [markdown])

  const handleCopyRichText = useCallback(async () => {
    if (!markdown) return
    // Simple rich text copy: convert markdown to basic HTML
    const html = markdown
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- \[x\] (.+)$/gm, '<li>$1</li>')
      .replace(/^- \[ \] (.+)$/gm, '<li>$1</li>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/\n/g, '<br/>')
    try {
      const blob = new Blob([html], { type: 'text/html' })
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob })])
      message.success('富文本已复制')
    } catch {
      await copyToClipboard(markdown)
      message.info('已降级为 Markdown 复制')
    }
  }, [markdown])

  const handleDownload = useCallback(() => {
    if (!markdown) return
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${formatDate(new Date())}.md`
    a.click()
    URL.revokeObjectURL(url)
    message.success('文件已下载')
  }, [markdown])

  const handleSave = useCallback(async () => {
    if (!markdown) return
    const selected = periodOptions.find((o) => o.value === periodValue)
    if (!selected) return
    setLoading(true)
    try {
      const report = await saveReport({
        scope,
        rangeStart: formatDate(selected.start),
        rangeEnd: formatDate(selected.end),
        markdown,
      })
      setSavedReports((prev) => [report, ...prev])
      message.success('报告已保存')
    } catch {
      message.error('保存失败')
    } finally {
      setLoading(false)
    }
  }, [markdown, scope, periodValue, periodOptions])

  const handleDeleteReport = useCallback(async (id: string) => {
    try {
      await deleteReport(id)
      setSavedReports((prev) => prev.filter((r) => r.id !== id))
      message.success('已删除')
    } catch {
      message.error('删除失败')
    }
  }, [])

  const handleLoadReport = useCallback((report: SavedReport) => {
    setMarkdown(report.markdown)
    setScope(report.scope)
  }, [])

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      {/* Left panel: config & history */}
      <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card size="small" title="生成配置" style={{ borderRadius: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <Text style={{ fontSize: 12, color: '#666' }}>报告类型</Text>
              <Select
                value={scope}
                onChange={setScope}
                style={{ width: '100%', marginTop: 4 }}
                options={[
                  { label: '周报', value: 'weekly' },
                  { label: '月报', value: 'monthly' },
                ]}
              />
            </div>
            <div>
              <Text style={{ fontSize: 12, color: '#666' }}>选择周期</Text>
              <Select
                value={periodValue}
                onChange={setPeriodValue}
                style={{ width: '100%', marginTop: 4 }}
                options={periodOptions.map((o) => ({ label: o.label, value: o.value }))}
              />
            </div>
            <Button type="primary" block onClick={handleGenerate}>
              生成报告
            </Button>
          </div>
        </Card>

        <Card
          size="small"
          title="历史报告"
          style={{ borderRadius: 8, flex: 1, overflow: 'auto' }}
          bodyStyle={{ padding: '8px 12px' }}
        >
          {savedReports.length === 0 ? (
            <Text type="secondary" style={{ fontSize: 12 }}>暂无保存的报告</Text>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {savedReports.map((report) => (
                <div
                  key={report.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 8px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #f0f0f0',
                  }}
                  onClick={() => handleLoadReport(report)}
                >
                  <div>
                    <Text style={{ fontSize: 12 }}>
                      {report.scope === 'weekly' ? '周报' : '月报'}
                    </Text>
                    <br />
                    <Text style={{ fontSize: 11, color: '#999' }}>
                      {report.rangeStart} ~ {report.rangeEnd}
                    </Text>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteReport(report.id)
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Right panel: preview */}
      <Card
        size="small"
        title="周报预览"
        style={{ flex: 1, borderRadius: 8, display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        extra={
          markdown ? (
            <Space size="small">
              <Button size="small" icon={<CopyOutlined />} onClick={handleCopyMarkdown}>
                复制 Markdown
              </Button>
              <Button size="small" icon={<CopyOutlined />} onClick={handleCopyRichText}>
                复制富文本
              </Button>
              <Button size="small" icon={<DownloadOutlined />} onClick={handleDownload}>
                下载 .md
              </Button>
              <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={loading}>
                保存
              </Button>
            </Space>
          ) : null
        }
      >
        {markdown ? (
          <pre
            style={{
              flex: 1,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 13,
              lineHeight: 1.8,
              margin: 0,
              padding: 12,
              backgroundColor: '#fafafa',
              borderRadius: 6,
              border: '1px solid #f0f0f0',
            }}
          >
            {markdown}
          </pre>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text type="secondary">选择周期后点击「生成报告」预览内容</Text>
          </div>
        )}
      </Card>
    </div>
  )
}

export default ReportView
