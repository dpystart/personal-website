import { useState, useEffect, useCallback } from 'react'
import { Tabs, Segmented, Button, message, Spin } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { Task, TaskStatus, TaskCategory, WorkLog } from './types'
import { fetchTasks, createTask, updateTask, deleteTask, fetchLogs, createLog, deleteLog } from './api'
import BoardView from './BoardView'
import CalendarView from './CalendarView'
import ListView from './ListView'
import TodayFocus from './TodayFocus'
import DailyLog from './DailyLog'
import DashboardView from './DashboardView'
import ReportView from './ReportView'
import TaskDetailDrawer from './TaskDetailDrawer'
import TaskFormModal from './TaskFormModal'

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('board')
  const [viewMode, setViewMode] = useState<string>('看板')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>()
  const [defaultCategory, setDefaultCategory] = useState<TaskCategory | undefined>()
  const [detailTask, setDetailTask] = useState<Task | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const MOCK_TASKS: Task[] = [
    { id: '1', title: '生产集群 K8S 版本升级 1.27→1.29', category: 'cluster', status: 'in_progress', priority: 'P0', dueDate: '2026-06-25', progress: 40, tags: [], todayFocus: false, createdAt: '2026-06-20T09:00:00Z', updatedAt: '2026-06-22T14:00:00Z', description: '已完成预发验证，计划窗口期升级生产' },
    { id: '2', title: 'etcd 版本升级 3.5.9→3.5.12', category: 'cluster', status: 'completed', priority: 'P1', dueDate: '2026-06-22', progress: 100, tags: [], todayFocus: true, createdAt: '2026-06-19T09:00:00Z', updatedAt: '2026-06-22T11:00:00Z', completedAt: '2026-06-22T11:00:00Z' },
    { id: '3', title: '测试集群扩容 worker 节点 x3', category: 'cluster', status: 'pending', priority: 'P2', dueDate: '2026-06-24', progress: 0, tags: [], todayFocus: false, createdAt: '2026-06-21T09:00:00Z', updatedAt: '2026-06-21T09:00:00Z' },
    { id: '4', title: 'CoreDNS 配置优化（解析超时问题）', category: 'cluster', status: 'pending', priority: 'P2', dueDate: '2026-06-26', progress: 0, tags: [], todayFocus: false, createdAt: '2026-06-22T09:00:00Z', updatedAt: '2026-06-22T09:00:00Z' },
    { id: '5', title: 'A区存储节点 ceph-osd.15 磁盘故障', category: 'fault', status: 'blocked', priority: 'P0', dueDate: '2026-06-21', progress: 0, tags: [], todayFocus: true, createdAt: '2026-06-20T10:00:00Z', updatedAt: '2026-06-22T16:00:00Z', description: '已提交更换工单，等待机房确认备件' },
    { id: '6', title: 'B区网络交换机端口 flapping', category: 'fault', status: 'in_progress', priority: 'P1', dueDate: '2026-06-23', progress: 0, tags: [], todayFocus: true, createdAt: '2026-06-22T08:00:00Z', updatedAt: '2026-06-22T08:00:00Z' },
    { id: '7', title: 'C区 GPU 服务器电源模块故障更换', category: 'fault', status: 'completed', priority: 'P1', dueDate: '2026-06-20', progress: 100, tags: [], todayFocus: false, createdAt: '2026-06-18T09:00:00Z', updatedAt: '2026-06-20T15:00:00Z', completedAt: '2026-06-20T15:00:00Z' },
    { id: '8', title: 'prod-cluster CPU 使用率持续 >85%', category: 'alert', status: 'in_progress', priority: 'P1', dueDate: '2026-06-23', progress: 0, tags: [], todayFocus: true, createdAt: '2026-06-22T07:30:00Z', updatedAt: '2026-06-22T07:30:00Z' },
    { id: '9', title: 'node-exporter 内存告警误报排查', category: 'alert', status: 'completed', priority: 'P2', dueDate: '2026-06-22', progress: 100, tags: [], todayFocus: false, createdAt: '2026-06-22T09:00:00Z', updatedAt: '2026-06-22T14:30:00Z', completedAt: '2026-06-22T14:30:00Z' },
    { id: '10', title: '日志采集 Filebeat 堆积告警', category: 'alert', status: 'pending', priority: 'P2', dueDate: '2026-06-24', progress: 0, tags: [], todayFocus: false, createdAt: '2026-06-22T10:00:00Z', updatedAt: '2026-06-22T10:00:00Z' },
    { id: '11', title: '磁盘空间告警 /data 分区 >90%', category: 'alert', status: 'completed', priority: 'P3', dueDate: '2026-06-19', progress: 100, tags: [], todayFocus: false, createdAt: '2026-06-19T08:00:00Z', updatedAt: '2026-06-19T10:00:00Z', completedAt: '2026-06-19T10:00:00Z' },
    { id: '12', title: '3台 GPU 主机初始化交付（AI训练平台）', category: 'delivery', status: 'in_progress', priority: 'P1', dueDate: '2026-06-23', progress: 70, tags: [], todayFocus: true, createdAt: '2026-06-20T09:00:00Z', updatedAt: '2026-06-22T09:45:00Z', description: '系统装好，网络配置中' },
    { id: '13', title: '5台通用计算节点交付（大数据组）', category: 'delivery', status: 'pending', priority: 'P2', dueDate: '2026-06-26', progress: 0, tags: [], todayFocus: false, createdAt: '2026-06-22T09:00:00Z', updatedAt: '2026-06-22T09:00:00Z' },
    { id: '14', title: '2台高内存主机交付（ES集群扩容）', category: 'delivery', status: 'completed', priority: 'P2', dueDate: '2026-06-18', progress: 100, tags: [], todayFocus: false, createdAt: '2026-06-16T09:00:00Z', updatedAt: '2026-06-18T16:00:00Z', completedAt: '2026-06-18T16:00:00Z' },
  ]

  const MOCK_LOGS: WorkLog[] = [
    { id: 'l1', taskId: '5', content: 'A区磁盘故障已提交更换工单，联系机房确认备件到货时间', createdAt: '2026-06-23T16:10:00Z' },
    { id: 'l2', taskId: '9', content: 'node-exporter 告警排查完毕，修改阈值避免误报，已更新告警规则', createdAt: '2026-06-23T14:30:00Z' },
    { id: 'l3', taskId: '2', content: 'etcd 升级完成，3个master节点逐个滚动升级，集群状态正常', createdAt: '2026-06-23T11:20:00Z' },
    { id: 'l4', taskId: '12', content: 'GPU主机系统安装完成(Ubuntu22.04+CUDA12.1)，开始配置网络和存储挂载', createdAt: '2026-06-23T09:45:00Z' },
  ]

  const loadData = useCallback(async () => {
    try {
      const now = new Date()
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
      const [tasksData, logsData] = await Promise.all([
        fetchTasks({ from, to }),
        fetchLogs({ from, to }),
      ])
      setTasks(tasksData)
      setLogs(logsData)
    } catch {
      setTasks(MOCK_TASKS)
      setLogs(MOCK_LOGS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleCreateTask = async (task: Partial<Task>) => {
    try {
      const created = await createTask(task)
      message.success('任务创建成功')
      setTasks(prev => [created, ...prev])
    } catch {
      const newTask: Task = {
        id: Date.now().toString(),
        title: task.title || '',
        category: task.category || 'cluster',
        status: task.status || 'pending',
        priority: task.priority || 'P1',
        dueDate: task.dueDate,
        progress: task.progress || 0,
        description: task.description,
        tags: task.tags || [],
        todayFocus: task.todayFocus || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setTasks(prev => [newTask, ...prev])
      message.success('任务创建成功')
    }
    setModalOpen(false)
    setEditingTask(undefined)
  }

  const handleUpdateTask = async (task: Partial<Task>) => {
    if (!editingTask) return
    try {
      await updateTask(editingTask.id, task)
    } catch { /* fallback to local */ }
    setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...task, updatedAt: new Date().toISOString() } : t))
    message.success('任务更新成功')
    setModalOpen(false)
    setEditingTask(undefined)
  }

  const handleStatusChange = (id: string, status: TaskStatus) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t
      const updated = { ...t, status, updatedAt: new Date().toISOString() }
      if (status === 'completed') updated.completedAt = new Date().toISOString()
      else updated.completedAt = undefined
      return updated
    }))
    updateTask(id, { status }).catch(() => {})
  }

  const handleToggleFocus = (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const newStatus = task.status === 'completed' ? 'in_progress' : 'completed'
    handleStatusChange(id, newStatus as TaskStatus)
  }

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    deleteTask(id).catch(() => {})
    message.success('已删除')
  }

  const handleAddLog = async (content: string, taskId?: string) => {
    try {
      const created = await createLog({ content, taskId })
      setLogs(prev => [created, ...prev])
    } catch {
      const newLog: WorkLog = { id: Date.now().toString(), content, taskId, createdAt: new Date().toISOString() }
      setLogs(prev => [newLog, ...prev])
    }
  }

  const handleDeleteLog = (id: string) => {
    setLogs(prev => prev.filter(l => l.id !== id))
    deleteLog(id).catch(() => {})
  }

  const openDetail = (task: Task) => {
    setDetailTask(task)
    setDrawerOpen(true)
  }

  const handleDetailEdit = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? { ...updatedTask, updatedAt: new Date().toISOString() } : t))
    updateTask(updatedTask.id, updatedTask).catch(() => {})
    message.success('任务更新成功')
    setDrawerOpen(false)
  }

  const openEdit = (task: Task) => {
    setDrawerOpen(false)
    setEditingTask(task)
    setDefaultCategory(undefined)
    setModalOpen(true)
  }

  const handleAddTaskWithCategory = (category: TaskCategory) => {
    setEditingTask(undefined)
    setDefaultCategory(category)
    setModalOpen(true)
  }

  const renderBoardContent = () => {
    switch (viewMode) {
      case '日历': return <CalendarView tasks={tasks} onEdit={openDetail} />
      case '列表': return <ListView tasks={tasks} onEdit={openDetail} onStatusChange={handleStatusChange} onDelete={handleDeleteTask} />
      default: return <BoardView tasks={tasks} onEdit={openDetail} onStatusChange={handleStatusChange} onDelete={handleDeleteTask} onAddTask={handleAddTaskWithCategory} />
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        tabBarExtraContent={
          activeTab === 'board' ? (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Segmented options={['看板', '日历', '列表']} value={viewMode} onChange={setViewMode} size="small" />
              <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => { setEditingTask(undefined); setDefaultCategory(undefined); setModalOpen(true) }}>新建任务</Button>
            </div>
          ) : activeTab === 'dashboard' ? null : null
        }
        items={[
          {
            key: 'board',
            label: '📋 任务看板',
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto' }}>
                <TodayFocus tasks={tasks} onToggle={handleToggleFocus} />
                {renderBoardContent()}
                <DailyLog logs={logs} tasks={tasks} onAdd={handleAddLog} onDelete={handleDeleteLog} />
              </div>
            ),
          },
          {
            key: 'dashboard',
            label: '📊 数据总览',
            children: <DashboardView tasks={tasks} logs={logs} />,
          },
          {
            key: 'report',
            label: '📝 周报中心',
            children: <ReportView tasks={tasks} logs={logs} />,
          },
        ]}
        style={{ flex: 1, minHeight: 0 }}
      />

      <TaskDetailDrawer
        task={detailTask}
        logs={logs}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onEdit={handleDetailEdit}
      />

      <TaskFormModal
        open={modalOpen}
        task={editingTask}
        defaultCategory={defaultCategory}
        onClose={() => { setModalOpen(false); setEditingTask(undefined); setDefaultCategory(undefined) }}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
      />
    </div>
  )
}
