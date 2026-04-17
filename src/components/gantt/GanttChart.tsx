'use client'

import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { Plus, SlidersHorizontal, X } from 'lucide-react'
import { useTaskStore } from '@/store/taskStore'
import { useUIStore } from '@/store/uiStore'
import type { GanttColKey } from '@/store/uiStore'
import { useProjectStore } from '@/store/projectStore'
import AddTaskModal from './AddTaskModal'
import TaskContextMenu from './TaskContextMenu'
import { useGanttDrag } from './hooks/useGanttDrag'
import DatePickerPopup from '@/components/ui/DatePickerPopup'
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
import type { Task } from '@/types'

const ROW_HEIGHT = 36
const HEADER_HEIGHT = 56
const TOTAL_ROWS = 30  // minimum rows shown (Excel-like)

// Column definitions
interface ColDef {
  label: string
  width: number
  removable: boolean
}

const COL_DEFS: Record<GanttColKey, ColDef> = {
  name:       { label: 'タスク名', width: 180, removable: false },
  start_date: { label: '開始日',   width: 90,  removable: true  },
  end_date:   { label: '終了日',   width: 90,  removable: true  },
  progress:   { label: '進捗率',   width: 80,  removable: true  },
  updated_at: { label: '更新日',   width: 100, removable: true  },
}

const ALL_COL_KEYS: GanttColKey[] = ['name', 'start_date', 'end_date', 'progress', 'updated_at']

// Helper: format date as YYYY/MM/DD
function fmtDate(val: string | null | undefined): string {
  if (!val) return '-'
  try {
    return format(new Date(val), 'yyyy/MM/dd')
  } catch {
    return '-'
  }
}

// API patch function
async function patchTask(id: string, updates: Partial<Task>): Promise<Task> {
  const res = await fetch('/api/tasks', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  })
  if (!res.ok) throw new Error('Failed to patch task')
  return res.json()
}

export default function GanttChart() {
  const { tasks, phases, updateTask, upsertTask } = useTaskStore()
  const { zoomLevel, ganttColumns, setGanttColumns } = useUIStore()
  const { currentProject, currentUserRole } = useProjectStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const leftScrollRef = useRef<HTMLDivElement>(null)
  const colMenuRef = useRef<HTMLDivElement>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ task: typeof tasks[0]; x: number; y: number } | null>(null)
  const [editing, setEditing] = useState<{ taskId: string; field: GanttColKey } | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [showColMenu, setShowColMenu] = useState(false)
  const [inlineRow, setInlineRow] = useState<number | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [datePicker, setDatePicker] = useState<{
    taskId: string
    field: 'start_date' | 'end_date'
    rect: DOMRect
  } | null>(null)

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

  // Left panel width = sum of visible column widths
  const leftPanelWidth = useMemo(
    () => ganttColumns.reduce((sum, key) => sum + COL_DEFS[key].width, 0),
    [ganttColumns]
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

  // Close column menu on outside click
  useEffect(() => {
    if (!showColMenu) return
    const handler = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setShowColMenu(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [showColMenu])

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

  // Group tasks by phase + empty rows
  const rows = useMemo(() => {
    const result: Array<
      | { type: 'phase'; phase: typeof phases[0] }
      | { type: 'task'; task: typeof tasks[0]; phaseColor: string }
      | { type: 'empty'; index: number }
    > = []

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

    // Pad to TOTAL_ROWS with empty rows
    const emptyCount = Math.max(0, TOTAL_ROWS - result.length)
    for (let i = 0; i < emptyCount; i++) {
      result.push({ type: 'empty', index: i })
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

  // Start inline editing
  const startEdit = useCallback((taskId: string, field: GanttColKey, currentVal: string) => {
    if (!canEdit) return
    if (field === 'updated_at') return
    setEditing({ taskId, field })
    setEditValue(currentVal)
  }, [canEdit])

  // Commit inline edit
  const commitEdit = useCallback(async () => {
    if (!editing) return
    const { taskId, field } = editing
    setEditing(null)

    let updates: Partial<Task> = {}
    if (field === 'name') {
      updates = { name: editValue }
    } else if (field === 'start_date') {
      updates = { start_date: editValue || null }
    } else if (field === 'end_date') {
      updates = { end_date: editValue || null }
    } else if (field === 'progress') {
      const num = parseInt(editValue, 10)
      if (!isNaN(num)) updates = { progress: Math.min(100, Math.max(0, num)) }
    }

    if (Object.keys(updates).length === 0) return

    // Optimistic update
    updateTask(taskId, updates)

    try {
      await patchTask(taskId, updates)
    } catch (err) {
      console.error('Failed to save task:', err)
    }
  }, [editing, editValue, updateTask])

  // Create task inline from empty row
  const createTaskInline = useCallback(async (name: string) => {
    if (!currentProject || !name.trim()) return
    setInlineRow(null)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: currentProject.id, name: name.trim() }),
      })
      if (res.ok) upsertTask(await res.json())
    } catch { /* ignore */ }
  }, [currentProject, upsertTask])

  // Get display value for a cell
  const getCellValue = (task: Task, field: GanttColKey): string => {
    switch (field) {
      case 'name':       return task.name
      case 'start_date': return fmtDate(task.start_date)
      case 'end_date':   return fmtDate(task.end_date)
      case 'progress':   return `${task.progress}%`
      case 'updated_at': return fmtDate(task.updated_at)
      default:           return ''
    }
  }

  // Get raw edit value for a cell
  const getRawValue = (task: Task, field: GanttColKey): string => {
    switch (field) {
      case 'name':       return task.name
      case 'start_date': return task.start_date ?? ''
      case 'end_date':   return task.end_date ?? ''
      case 'progress':   return String(task.progress)
      default:           return ''
    }
  }

  const toggleColumn = (key: GanttColKey) => {
    if (key === 'name') return // always shown
    if (ganttColumns.includes(key)) {
      setGanttColumns(ganttColumns.filter((c) => c !== key))
    } else {
      // Insert in original order
      const newCols = ALL_COL_KEYS.filter((k) => k === key || ganttColumns.includes(k))
      setGanttColumns(newCols)
    }
  }

  if (!currentProject) return null

  return (
    <>
    <div className="h-full flex overflow-hidden select-none">
      {/* Left panel: multi-column */}
      <div
        className="flex-shrink-0 border-r border-gray-200 flex flex-col bg-white z-10"
        style={{ width: leftPanelWidth }}
      >
        {/* Header row */}
        <div
          className="border-b border-gray-200 flex items-center flex-shrink-0 bg-gray-50 relative"
          style={{ height: HEADER_HEIGHT }}
        >
          {ganttColumns.map((key) => {
            const def = COL_DEFS[key]
            return (
              <div
                key={key}
                className="flex items-center justify-between px-2 border-r border-gray-200 flex-shrink-0 group"
                style={{ width: def.width, height: '100%' }}
              >
                <span className="text-xs font-medium text-gray-500 truncate">{def.label}</span>
                {def.removable && (
                  <button
                    onClick={() => toggleColumn(key)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 transition-opacity"
                    title={`${def.label}を非表示`}
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                )}
              </div>
            )
          })}

          {/* Column picker button */}
          <div ref={colMenuRef} className="absolute right-0 top-0 bottom-0 flex items-center pr-1">
            <button
              onClick={() => setShowColMenu((v) => !v)}
              className="p-1 rounded hover:bg-gray-200 transition-colors"
              title="カラム表示設定"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
            </button>

            {showColMenu && (
              <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                <p className="text-xs font-medium text-gray-500 px-3 py-1 border-b border-gray-100">表示カラム</p>
                {ALL_COL_KEYS.map((key) => {
                  const def = COL_DEFS[key]
                  const checked = ganttColumns.includes(key)
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-50 ${key === 'name' ? 'opacity-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={key === 'name'}
                        onChange={() => toggleColumn(key)}
                        className="w-3 h-3 accent-blue-600"
                      />
                      <span className="text-gray-700">{def.label}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {/* Add button */}
          {canEdit && (
            <div className="absolute left-2 bottom-1">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1 px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="タスク/フェーズを追加"
              >
                <Plus className="w-3 h-3" />
                追加
              </button>
            </div>
          )}
        </div>

        {/* Task list */}
        <div
          ref={leftScrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          {rows.map((row, i) => {
            // Empty row
            if (row.type === 'empty') {
              const isInlineEditing = inlineRow === row.index
              return (
                <div
                  key={`empty-${row.index}`}
                  className="flex items-center border-b border-gray-100 hover:bg-blue-50/20"
                  style={{ height: ROW_HEIGHT, width: leftPanelWidth }}
                >
                  {ganttColumns.map((key, colIdx) => {
                    const def = COL_DEFS[key]
                    if (colIdx === 0) {
                      return (
                        <div
                          key={key}
                          className="flex-shrink-0 flex items-center border-r border-gray-100 pl-8 pr-1"
                          style={{ width: def.width, height: '100%' }}
                          onClick={() => {
                            if (canEdit && !isInlineEditing) setInlineRow(row.index)
                          }}
                        >
                          {isInlineEditing ? (
                            <input
                              autoFocus
                              type="text"
                              className="w-full text-xs bg-blue-50 border border-blue-300 rounded px-1 py-0.5 outline-none"
                              onBlur={(e) => {
                                const v = e.target.value.trim()
                                if (v) createTaskInline(v)
                                else setInlineRow(null)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const target = e.target as HTMLInputElement
                                  const v = target.value.trim()
                                  target.value = ''
                                  if (v) createTaskInline(v)
                                  else setInlineRow(null)
                                  target.blur()
                                }
                                if (e.key === 'Escape') {
                                  ;(e.target as HTMLInputElement).value = ''
                                  setInlineRow(null)
                                }
                              }}
                            />
                          ) : (
                            <span className={canEdit ? 'w-full h-full cursor-text' : ''} />
                          )}
                        </div>
                      )
                    }
                    return (
                      <div
                        key={key}
                        className="flex-shrink-0 border-r border-gray-100"
                        style={{ width: def.width, height: '100%' }}
                      />
                    )
                  })}
                </div>
              )
            }

            if (row.type === 'phase') {
              return (
                <div
                  key={`phase-${row.phase.id}-${i}`}
                  className="flex items-center bg-gray-50 border-b border-gray-100"
                  style={{ height: ROW_HEIGHT, width: leftPanelWidth }}
                >
                  {/* Phase row spans all columns */}
                  <div className="flex items-center gap-2 px-4" style={{ width: leftPanelWidth }}>
                    <div
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: row.phase.color }}
                    />
                    <span className="text-xs font-semibold text-gray-700 truncate">
                      {row.phase.name}
                    </span>
                  </div>
                </div>
              )
            }

            const { task, phaseColor } = row
            const isRowSelected = selectedTaskId === task.id
            return (
              <div
                key={`task-${task.id}`}
                className={`flex items-center border-b border-gray-100 transition-colors ${
                  isRowSelected ? 'bg-blue-50' : 'hover:bg-blue-50'
                }`}
                style={{ height: ROW_HEIGHT }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setContextMenu({ task, x: e.clientX, y: e.clientY })
                }}
              >
                {ganttColumns.map((key, colIdx) => {
                  const def = COL_DEFS[key]
                  const isEditing = editing?.taskId === task.id && editing?.field === key
                  const isEditable = canEdit && key !== 'updated_at'
                  const isDateField = key === 'start_date' || key === 'end_date'

                  return (
                    <div
                      key={key}
                      className={`flex-shrink-0 flex items-center border-r border-gray-100 overflow-hidden ${
                        colIdx === 0 ? 'pl-8' : 'px-2'
                      } ${isEditable && !isDateField ? 'cursor-text' : isEditable && isDateField ? 'cursor-pointer' : ''}`}
                      style={{ width: def.width, height: '100%' }}
                      onClick={(e) => {
                        if (!isEditable) return
                        if (isDateField) {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          setDatePicker({ taskId: task.id, field: key as 'start_date' | 'end_date', rect })
                        } else if (key === 'name') {
                          setSelectedTaskId(task.id)
                        } else {
                          startEdit(task.id, key, getRawValue(task, key))
                        }
                      }}
                      onDoubleClick={() => {
                        if (!canEdit || key === 'updated_at' || isDateField) return
                        startEdit(task.id, key, getRawValue(task, key))
                      }}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          type={key === 'progress' ? 'number' : 'text'}
                          min={key === 'progress' ? 0 : undefined}
                          max={key === 'progress' ? 100 : undefined}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit()
                            if (e.key === 'Escape') setEditing(null)
                          }}
                          className="w-full text-xs bg-white border border-blue-400 rounded px-1 outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          {colIdx === 0 && (
                            <div
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0 mr-2"
                              style={{ backgroundColor: phaseColor }}
                            />
                          )}
                          <span className="text-xs text-gray-700 truncate">
                            {getCellValue(task, key)}
                          </span>
                        </>
                      )}
                    </div>
                  )
                })}
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
              if (row.type === 'phase' || row.type === 'empty') return null
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
      {datePicker && (
        <DatePickerPopup
          value={
            datePicker.field === 'start_date'
              ? tasks.find(t => t.id === datePicker.taskId)?.start_date ?? null
              : tasks.find(t => t.id === datePicker.taskId)?.end_date ?? null
          }
          anchorRect={datePicker.rect}
          onChange={(date) => {
            const updates: Partial<Task> = { [datePicker.field]: date }
            updateTask(datePicker.taskId, updates)
            patchTask(datePicker.taskId, updates).catch(console.error)
          }}
          onClose={() => setDatePicker(null)}
        />
      )}
    </>
  )
}
