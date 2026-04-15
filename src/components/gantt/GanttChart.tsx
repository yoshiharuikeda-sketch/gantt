'use client'

import { useRef, useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useTaskStore } from '@/store/taskStore'
import { useUIStore } from '@/store/uiStore'
import { useProjectStore } from '@/store/projectStore'
import AddTaskModal from './AddTaskModal'
import TaskContextMenu from './TaskContextMenu'
import { useGanttDrag } from './hooks/useGanttDrag'
import {
  DAY_WIDTH_MAP,
  getBarX,
  getBarWidth,
  getTimelineRange,
} from '@/lib/ganttUtils'
import {
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isToday,
  addDays,
  startOfWeek,
  startOfMonth,
} from '@/lib/utils/dateUtils'

const ROW_HEIGHT = 36
const HEADER_HEIGHT = 56
const LEFT_PANEL_WIDTH = 280

export default function GanttChart() {
  const { tasks, phases } = useTaskStore()
  const { zoomLevel } = useUIStore()
  const { currentProject, currentUserRole } = useProjectStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const leftScrollRef = useRef<HTMLDivElement>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ task: typeof tasks[0]; x: number; y: number } | null>(null)

  const canEdit = currentUserRole === 'owner' || currentUserRole === 'editor'

  const dayWidth = DAY_WIDTH_MAP[zoomLevel]
  const { start: timelineStart, end: timelineEnd } = useMemo(
    () => getTimelineRange(tasks),
    [tasks]
  )

  const { draggingTaskId, ghostDates, onMouseDown, onMouseMove, onMouseUp } = useGanttDrag(
    timelineStart,
    dayWidth,
    canEdit
  )

  // Attach global mouse events for drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => onMouseMove(e)
    const handleMouseUp = () => onMouseUp()
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  // Sync vertical scroll between left and right panels
  useEffect(() => {
    const right = scrollRef.current
    const left = leftScrollRef.current
    if (!right || !left) return

    const onRightScroll = () => {
      left.scrollTop = right.scrollTop
    }
    const onLeftScroll = () => {
      right.scrollTop = left.scrollTop
    }

    right.addEventListener('scroll', onRightScroll)
    left.addEventListener('scroll', onLeftScroll)
    return () => {
      right.removeEventListener('scroll', onRightScroll)
      left.removeEventListener('scroll', onLeftScroll)
    }
  }, [])

  // Scroll to today on mount
  useEffect(() => {
    if (!scrollRef.current) return
    const todayX = getBarX(new Date(), timelineStart, dayWidth)
    const centerOffset = scrollRef.current.clientWidth / 2
    scrollRef.current.scrollLeft = Math.max(0, todayX - centerOffset)
  }, [timelineStart, dayWidth])

  // Build column headers
  const columns = useMemo(() => {
    if (zoomLevel === 'day') {
      return eachDayOfInterval({ start: timelineStart, end: timelineEnd }).map((d) => ({
        date: d,
        label: format(d, 'd'),
        sublabel: format(d, 'M月'),
        isToday: isToday(d),
        x: getBarX(d, timelineStart, dayWidth),
        width: dayWidth,
      }))
    }
    if (zoomLevel === 'week') {
      return eachWeekOfInterval(
        { start: timelineStart, end: timelineEnd },
        { weekStartsOn: 1 }
      ).map((d) => ({
        date: d,
        label: format(d, 'M/d'),
        sublabel: format(d, 'yyyy年M月'),
        isToday: false,
        x: getBarX(d, timelineStart, dayWidth),
        width: dayWidth * 7,
      }))
    }
    // month
    return eachMonthOfInterval({ start: timelineStart, end: timelineEnd }).map((d) => ({
      date: d,
      label: format(d, 'M月'),
      sublabel: format(d, 'yyyy年'),
      isToday: false,
      x: getBarX(d, timelineStart, dayWidth),
      width: dayWidth * 30,
    }))
  }, [zoomLevel, timelineStart, timelineEnd, dayWidth])

  // Group tasks by phase
  const rows = useMemo(() => {
    const result: Array<{ type: 'phase'; phase: typeof phases[0] } | { type: 'task'; task: typeof tasks[0]; phaseColor: string }> = []

    const phasedTasks = new Set<string>()

    // Phases with their tasks
    for (const phase of phases) {
      const phaseTasks = tasks.filter((t) => t.phase_id === phase.id)
      if (phaseTasks.length > 0) {
        result.push({ type: 'phase', phase })
        for (const task of phaseTasks) {
          result.push({ type: 'task', task, phaseColor: phase.color })
          phasedTasks.add(task.id)
        }
      }
    }

    // Tasks without a phase
    const unphased = tasks.filter((t) => !phasedTasks.has(t.id))
    if (unphased.length > 0) {
      result.push({ type: 'phase', phase: { id: '__none__', name: 'フェーズなし', color: '#94a3b8', project_id: '', display_order: 999, start_date: null, end_date: null } })
      for (const task of unphased) {
        result.push({ type: 'task', task, phaseColor: '#94a3b8' })
      }
    }

    return result
  }, [tasks, phases])

  const totalWidth = getBarX(timelineEnd, timelineStart, dayWidth) + dayWidth * 2
  const totalHeight = rows.length * ROW_HEIGHT

  // Today line X position
  const todayX = getBarX(new Date(), timelineStart, dayWidth)

  const statusColors: Record<string, string> = {
    not_started: '#94a3b8',
    in_progress: '#3b82f6',
    completed: '#22c55e',
    blocked: '#ef4444',
  }

  if (!currentProject) return null

  if (tasks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-sm font-medium text-gray-500">タスクがありません</p>
          <p className="text-xs mt-1">タスクを追加するとGanttチャートが表示されます</p>
          {canEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 mx-auto bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              タスク追加
            </button>
          )}
        </div>
        {showAddModal && <AddTaskModal onClose={() => setShowAddModal(false)} />}
      </div>
    )
  }

  return (
    <>
    <div className="h-full flex overflow-hidden select-none">
      {/* Left panel: task names */}
      <div
        className="flex-shrink-0 border-r border-gray-200 flex flex-col bg-white z-10"
        style={{ width: LEFT_PANEL_WIDTH }}
      >
        {/* Header */}
        <div
          className="border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0 bg-gray-50"
          style={{ height: HEADER_HEIGHT }}
        >
          <span className="text-xs font-medium text-gray-500">タスク名</span>
          {canEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="タスク/フェーズを追加"
            >
              <Plus className="w-3.5 h-3.5" />
              追加
            </button>
          )}
        </div>

        {/* Task list */}
        <div
          ref={leftScrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          {rows.map((row, i) => {
            if (row.type === 'phase') {
              return (
                <div
                  key={`phase-${row.phase.id}-${i}`}
                  className="flex items-center gap-2 px-4 bg-gray-50 border-b border-gray-100"
                  style={{ height: ROW_HEIGHT }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: row.phase.color }}
                  />
                  <span className="text-xs font-semibold text-gray-700 truncate">
                    {row.phase.name}
                  </span>
                </div>
              )
            }

            const { task, phaseColor } = row
            return (
              <div
                key={`task-${task.id}`}
                className="flex items-center gap-2 px-4 pl-8 border-b border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer"
                style={{ height: ROW_HEIGHT }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setContextMenu({ task, x: e.clientX, y: e.clientY })
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: phaseColor }}
                />
                <span className="text-xs text-gray-700 truncate">{task.name}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right panel: timeline */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Timeline header */}
        <div
          className="flex-shrink-0 bg-gray-50 border-b border-gray-200 overflow-hidden"
          style={{ height: HEADER_HEIGHT }}
        >
          <div
            className="relative"
            style={{ width: totalWidth, height: HEADER_HEIGHT }}
          >
            {/* Month / Year labels at top */}
            {zoomLevel !== 'month' && (
              <div className="absolute top-0 left-0 right-0 h-6 flex">
                {columns
                  .filter((_, i) => i === 0 || columns[i].sublabel !== columns[i - 1].sublabel)
                  .map((col) => (
                    <div
                      key={col.date.toISOString()}
                      className="absolute top-0 text-xs text-gray-400 font-medium pl-1 pt-0.5"
                      style={{ left: col.x }}
                    >
                      {col.sublabel}
                    </div>
                  ))}
              </div>
            )}

            {/* Column cells */}
            <div className="absolute bottom-0 left-0 right-0 flex" style={{ top: zoomLevel !== 'month' ? 24 : 0 }}>
              {columns.map((col) => (
                <div
                  key={col.date.toISOString()}
                  className={`absolute bottom-0 flex items-center justify-center border-r border-gray-200 text-xs font-medium ${
                    col.isToday
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-500'
                  }`}
                  style={{
                    left: col.x,
                    width: col.width,
                    top: 0,
                  }}
                >
                  {col.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto"
        >
          <div className="relative" style={{ width: totalWidth, height: totalHeight }}>
            {/* Column grid lines */}
            {columns.map((col) => (
              <div
                key={col.date.toISOString()}
                className={`absolute top-0 bottom-0 border-r ${
                  col.isToday ? 'border-blue-200 bg-blue-50/40' : 'border-gray-100'
                }`}
                style={{ left: col.x, width: col.width }}
              />
            ))}

            {/* Row lines */}
            {rows.map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-b border-gray-100"
                style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
              />
            ))}

            {/* Today line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-400 z-10 pointer-events-none"
              style={{ left: todayX }}
            />

            {/* Task bars */}
            {rows.map((row, i) => {
              if (row.type === 'phase') return null
              const { task, phaseColor } = row
              if (!task.start_date || !task.end_date) return null

              const isDragging = draggingTaskId === task.id
              const displayStart = isDragging && ghostDates ? ghostDates.start : task.start_date
              const displayEnd = isDragging && ghostDates ? ghostDates.end : task.end_date

              const x = getBarX(displayStart, timelineStart, dayWidth)
              const width = getBarWidth(displayStart, displayEnd, dayWidth)
              const barColor = statusColors[task.status] ?? phaseColor
              const top = i * ROW_HEIGHT + ROW_HEIGHT * 0.2
              const height = ROW_HEIGHT * 0.6

              return (
                <div
                  key={`bar-${task.id}`}
                  className={`absolute rounded group ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} hover:brightness-110 ${isDragging ? 'opacity-80 z-20' : ''}`}
                  style={{
                    left: x,
                    top,
                    width: Math.max(width, dayWidth),
                    height,
                    backgroundColor: barColor + '33',
                    border: `1.5px solid ${barColor}`,
                    transition: isDragging ? 'none' : undefined,
                  }}
                  onMouseDown={canEdit ? (e) => onMouseDown(e, task, 'move') : undefined}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setContextMenu({ task, x: e.clientX, y: e.clientY })
                  }}
                  title={`${task.name}\n${displayStart} → ${displayEnd}\n進捗: ${task.progress}%`}
                >
                  {/* Resize handle left */}
                  {canEdit && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100"
                      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, task, 'resize-left') }}
                    />
                  )}

                  {/* Progress fill */}
                  <div
                    className="absolute left-0 top-0 bottom-0 rounded-sm"
                    style={{
                      width: `${task.progress}%`,
                      backgroundColor: barColor + '88',
                    }}
                  />

                  {/* Label */}
                  {width > 40 && (
                    <span
                      className="absolute inset-0 flex items-center px-1.5 text-xs font-medium truncate pointer-events-none"
                      style={{ color: barColor }}
                    >
                      {task.name}
                    </span>
                  )}

                  {/* Resize handle right */}
                  {canEdit && (
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100"
                      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, task, 'resize-right') }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>

      {showAddModal && <AddTaskModal onClose={() => setShowAddModal(false)} />}
      {contextMenu && (
        <TaskContextMenu
          task={contextMenu.task}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  )
}
