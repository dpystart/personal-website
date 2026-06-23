import React, { useMemo } from 'react'
import { Card, Statistic, Progress, Typography } from 'antd'
import type { Task, WorkLog, TaskCategory } from './types'
import { CATEGORY_CONFIG } from './types'

const { Title, Text } = Typography

interface DashboardViewProps {
  tasks: Task[]
  logs: WorkLog[]
}

/** Get Monday 00:00 ~ Sunday 23:59 of the current week */
function getThisWeekRange(): [Date, Date] {
  const now = new Date()
  const day = now.getDay() // 0=Sun
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return [monday, sunday]
}

/** Get the start-of-week (Monday) for N weeks ago */
function getWeekStart(weeksAgo: number): Date {
  const [monday] = getThisWeekRange()
  const d = new Date(monday)
  d.setDate(d.getDate() - weeksAgo * 7)
  return d
}

function isInRange(dateStr: string, start: Date, end: Date): boolean {
  const d = new Date(dateStr)
  return d >= start && d <= end
}

const COLORS: Record<TaskCategory, string> = {
  cluster: CATEGORY_CONFIG.cluster.color,
  fault: CATEGORY_CONFIG.fault.color,
  alert: CATEGORY_CONFIG.alert.color,
  delivery: CATEGORY_CONFIG.delivery.color,
}

const DashboardView: React.FC<DashboardViewProps> = ({ tasks, logs }) => {
  const [weekStart, weekEnd] = useMemo(() => getThisWeekRange(), [])

  const thisWeekTasks = useMemo(
    () => tasks.filter((t) => isInRange(t.createdAt, weekStart, weekEnd)),
    [tasks, weekStart, weekEnd]
  )

  // --- Stat cards data ---
  const clusterCount = thisWeekTasks.filter((t) => t.category === 'cluster').length

  const faultTasks = thisWeekTasks.filter((t) => t.category === 'fault')
  const faultBlocked = faultTasks.some((t) => t.status === 'blocked' || (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'))

  const alertTasks = thisWeekTasks.filter((t) => t.category === 'alert')
  const alertResolved = alertTasks.filter((t) => t.status === 'completed').length
  const alertPending = alertTasks.length - alertResolved

  const deliveryTasks = thisWeekTasks.filter((t) => t.category === 'delivery')
  const deliveryDone = deliveryTasks.filter((t) => t.status === 'completed').length
  const deliveryInProgress = deliveryTasks.filter((t) => t.status === 'in_progress').length

  // --- Chart data: last 4 weeks completed ---
  const weeklyCompleted = useMemo(() => {
    const result: number[] = []
    for (let i = 3; i >= 0; i--) {
      const start = getWeekStart(i)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      const count = tasks.filter(
        (t) => t.status === 'completed' && t.completedAt && isInRange(t.completedAt, start, end)
      ).length
      result.push(count)
    }
    return result
  }, [tasks])

  const maxCompleted = Math.max(...weeklyCompleted, 1)

  // --- Pie chart data ---
  const categoryDistribution = useMemo(() => {
    const counts: Record<TaskCategory, number> = { cluster: 0, fault: 0, alert: 0, delivery: 0 }
    tasks.forEach((t) => { counts[t.category]++ })
    const total = tasks.length || 1
    return (Object.keys(counts) as TaskCategory[]).map((cat) => ({
      category: cat,
      count: counts[cat],
      percent: counts[cat] / total,
    }))
  }, [tasks])

  const conicGradient = useMemo(() => {
    let accumulated = 0
    const stops: string[] = []
    categoryDistribution.forEach(({ category, percent }) => {
      const start = accumulated * 360
      accumulated += percent
      const end = accumulated * 360
      stops.push(`${COLORS[category]} ${start}deg ${end}deg`)
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [categoryDistribution])

  // --- In-progress tasks for timeline ---
  const inProgressTasks = useMemo(
    () => tasks.filter((t) => t.status === 'in_progress'),
    [tasks]
  )

  return (
    <div style={{ padding: '0 0 24px' }}>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <Card size="small" style={{ borderRadius: 8 }}>
          <Statistic
            title={<span>{CATEGORY_CONFIG.cluster.icon} {CATEGORY_CONFIG.cluster.label}</span>}
            value={clusterCount}
            suffix="件本周"
            valueStyle={{ color: COLORS.cluster }}
          />
        </Card>
        <Card size="small" style={{ borderRadius: 8, borderColor: faultBlocked ? '#ef4444' : undefined }}>
          <Statistic
            title={<span>{CATEGORY_CONFIG.fault.icon} {CATEGORY_CONFIG.fault.label}</span>}
            value={faultTasks.length}
            suffix="件"
            valueStyle={{ color: COLORS.fault }}
          />
          {faultBlocked && (
            <Text type="danger" style={{ fontSize: 12 }}>存在阻塞/逾期工单</Text>
          )}
        </Card>
        <Card size="small" style={{ borderRadius: 8 }}>
          <Statistic
            title={<span>{CATEGORY_CONFIG.alert.icon} {CATEGORY_CONFIG.alert.label}</span>}
            value={alertTasks.length}
            valueStyle={{ color: COLORS.alert }}
          />
          <Text style={{ fontSize: 12, color: '#666' }}>
            已解决 {alertResolved} / 待处理 {alertPending}
          </Text>
        </Card>
        <Card size="small" style={{ borderRadius: 8 }}>
          <Statistic
            title={<span>{CATEGORY_CONFIG.delivery.icon} {CATEGORY_CONFIG.delivery.label}</span>}
            value={deliveryTasks.length}
            valueStyle={{ color: COLORS.delivery }}
          />
          <Text style={{ fontSize: 12, color: '#666' }}>
            进行中 {deliveryInProgress} / 已完成 {deliveryDone}
          </Text>
        </Card>
      </div>

      {/* Charts section */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {/* Bar chart: 近4周完成趋势 */}
        <Card size="small" style={{ flex: 2, borderRadius: 8 }}>
          <Title level={5} style={{ marginTop: 0 }}>近4周完成趋势</Title>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: 160, gap: 24, padding: '0 16px' }}>
            {weeklyCompleted.map((count, idx) => {
              const height = (count / maxCompleted) * 120
              const label = idx === 3 ? '本周' : `${3 - idx}周前`
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <Text style={{ fontSize: 12, marginBottom: 4 }}>{count}</Text>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 48,
                      height: Math.max(height, 4),
                      backgroundColor: '#3b82f6',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s',
                    }}
                  />
                  <Text style={{ fontSize: 12, marginTop: 6, color: '#888' }}>{label}</Text>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Pie chart: 任务分类占比 */}
        <Card size="small" style={{ flex: 1, borderRadius: 8 }}>
          <Title level={5} style={{ marginTop: 0 }}>任务分类占比</Title>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: conicGradient,
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', justifyContent: 'center' }}>
              {categoryDistribution.map(({ category, count, percent }) => (
                <div key={category} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: COLORS[category], display: 'inline-block' }} />
                  <span>{CATEGORY_CONFIG[category].label}</span>
                  <span style={{ color: '#999' }}>{count}({(percent * 100).toFixed(0)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Timeline: 本周进度时间线 */}
      <Card size="small" style={{ borderRadius: 8 }}>
        <Title level={5} style={{ marginTop: 0 }}>本周进度时间线</Title>
        {inProgressTasks.length === 0 ? (
          <Text type="secondary">本周暂无进行中的任务</Text>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {inProgressTasks.map((task) => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18 }}>{CATEGORY_CONFIG[task.category].icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 13 }}>{task.title}</Text>
                    <Text style={{ fontSize: 12, color: '#999' }}>{task.progress}%</Text>
                  </div>
                  <Progress
                    percent={task.progress}
                    showInfo={false}
                    strokeColor={COLORS[task.category]}
                    size="small"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default DashboardView
