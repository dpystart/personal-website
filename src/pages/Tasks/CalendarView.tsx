import React from 'react'
import { Calendar, Tag } from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import type { Task } from './types'
import { CATEGORY_CONFIG } from './types'

interface CalendarViewProps {
  tasks: Task[]
  onEdit: (task: Task) => void
}

const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onEdit }) => {
  const getTasksForDate = (date: Dayjs): Task[] => {
    const dateStr = date.format('YYYY-MM-DD')
    return tasks.filter((task) => task.dueDate && dayjs(task.dueDate).format('YYYY-MM-DD') === dateStr)
  }

  const cellRender = (current: Dayjs, info: { type: string }) => {
    if (info.type !== 'date') return null

    const dateTasks = getTasksForDate(current)
    if (dateTasks.length === 0) return null

    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {dateTasks.map((task) => {
          const config = CATEGORY_CONFIG[task.category]
          const isCompleted = task.status === 'completed'
          return (
            <li key={task.id} style={{ marginBottom: 2 }}>
              <Tag
                color={config.color}
                style={{
                  cursor: 'pointer',
                  fontSize: 12,
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  opacity: isCompleted ? 0.5 : 1,
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(task)
                }}
              >
                {task.title.length > 8 ? task.title.slice(0, 8) + '...' : task.title}
              </Tag>
            </li>
          )
        })}
      </ul>
    )
  }

  return <Calendar cellRender={cellRender} />
}

export default CalendarView
