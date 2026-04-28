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
} from '@/lib/utils/dateUtils'
import type { Task } from '@/types'

const ROW_HEIGHT = 38
const HEADER_HEIGHT = 52
const TOTAL_ROWS = 30

interface ColDef {
  label: string
  width: number
  removable: boolean
}

const COL_DEFS: Record<GanttColKey, ColDef> = {
  name:       { label: 'タスク名', width: 190, removable: false },
  start_date: { label: '開始日',   width: 90,  removable: true  },
  end_date:   { label: '終了日',   width: 90,  removable: true  },
  progress:   { label: '進捗率',   width: 78,  removable: true  },
  updated_at: { label: '更新日',   width: 100, removable: true  },
}

const ALL_COL_KEYS: GanttColKey[] = ['name', 'start_date', 'end_date', 'progress', 'updated_at']

function fmtDate(val: string | null | undefined): string {
  if (!val) return '—'
  try {
    return format(new Date(val), 'yyyy/MM/dd')
  } catch {
    return '—'
  }
}

async function patchTask(id: string, updates: Partial<Task>): Promise<Task> {
  const res = await fetch('/api/tasks', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  })
  if (!res.ok) throw new Error('Failed to patch task')
  return res.json()
}

const STATUS_COLORS: Record<string, string> = {
  not_started: '#94A3B8',
  in_progress: '#6366F1',
  completed:   '#10B981',
  blocked:     '#EF4444',
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

  const leftPanelWidth = useMemo(
    () => ganttColumns.reduce((sum, key) => sum + COL_DEFS[key].width, 0),
    [ganttColumns]
  )

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

  useEffect(() => {
    const right = scrollRef.current
    const left = leftScrollRef.current
    if (!right || !left) return
    const onRightScroll = () => { left.scrollTop = right.scrollTop }
    const onLeftScroll = () => { right.scrollTop = left.scrollTop }
    right.addEventListener('scroll', onRightScroll)
    left.addEventListener('scroll', onLeftScroll)
    return () => {
      right.removeEventListener('scroll', onRightScroll)
      left.removeEventListener('scroll', onLeftScroll)
    }
  }, [])

  useEffect(() => {
    if (!scrollRef.current) return
    const todayX = getBarX(new Date(), timelineStart, dayWidth)
    const centerOffset = scrollRef.current.clientWidth / 2
    scrollRef.current.scrollLeft = Math.max(0, todayX - centerOffset)
  }, [timelineStart, dayWidth])

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

  const columns = useMemo(() => {
    if (zoomLevel === 'day') {
      return eachDayOfInterval({ start: timelineStart, end: timelineEnd }).map((d) => ({
        date: d,
        label: format(d, 'd'),
        sublabel: format(d, 'M月'),
        isToday: isToday(d),
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
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
        isWeekend: false,
        x: getBarX(d, timelineStart, dayWidth),
        width: dayWidth * 7,
      }))
    }
    return eachMonthOfInterval({ start: timelineStart, end: timelineEnd }).map((d) => ({
      date: d,
      label: format(d, 'M月'),
      sublabel: format(d, 'yyyy年'),
      isToday: false,
      isWeekend: false,
      x: getBarX(d, timelineStart, dayWidth),
      width: dayWidth * 30,
    }))
  }, [zoomLevel, timelineStart, timelineEnd, dayWidth])

  const rows = useMemo(() => {
    const result: Array<
      | { type: 'phase'; phase: typeof phases[0] }
      | { type: 'task'; task: typeof tasks[0]; phaseColor: string }
      | { type: 'empty'; index: number }
    > = []

    const phasedTasks = new Set<string>()

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

    const unphased = tasks.filter((t) => !phasedTasks.has(t.id))
    if (unphased.length > 0) {
      result.push({
        type: 'phase',
        phase: { id: '__none__', name: 'フェーズなし', color: '#94A3B8', project_id: '', display_order: 999, start_date: null, end_date: null },
      })
      for (const task of unphased) {
        result.push({ type: 'task', task, phaseColor: '#94A3B8' })
      }
    }

    const emptyCount = Math.max(0, TOTAL_ROWS - result.length)
    for (let i = 0; i < emptyCount; i++) {
      result.push({ type: 'empty', index: i })
    }

    return result
  }, [tasks, phases])

  const totalWidth = getBarX(timelineEnd, timelineStart, dayWidth) + dayWidth * 2
  const totalHeight = rows.length * ROW_HEIGHT
  const todayX = getBarX(new Date(), timelineStart, dayWidth)

  const startEdit = useCallback((taskId: string, field: GanttColKey, currentVal: string) => {
    if (!canEdit) return
    if (field === 'updated_at') return
    setEditing({ taskId, field })
    setEditValue(currentVal)
  }, [canEdit])

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
    updateTask(taskId, updates)

    try {
      await patchTask(taskId, updates)
    } catch (err) {
      console.error('Failed to save task:', err)
    }
  }, [editing, editValue, updateTask])

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
    if (key === 'name') return
    if (ganttColumns.includes(key)) {
      setGanttColumns(ganttColumns.filter((c) => c !== key))
    } else {
      const newCols = ALL_COL_KEYS.filter((k) => k === key || ganttColumns.includes(k))
      setGanttColumns(newCols)
    }
  }

  if (!currentProject) return null

  return (
    <>
      <div className="h-full flex overflow-hidden select-none" style={{ background: '#FAFBFF' }}>
        {/* Left panel */}
        <div
          className="flex-shrink-0 flex flex-col z-10"
          style={{
            width: leftPanelWidth,
            background: '#FFFFFF',
            borderRight: '1px solid #EEF2FF',
          }}
        >
          {/* Header */}
          <div
            className="border-b flex items-center flex-shrink-0 relative"
            style={{
              height: HEADER_HEIGHT,
              background: '#FAFBFF',
              borderBottomColor: '#EEF2FF',
            }}
          >
            {ganttColumns.map((key) => {
              const def = COL_DEFS[key]
              return (
                <div
                  key={key}
                  className="flex items-center justify-between px-3 flex-shrink-0 group"
                  style={{
                    width: def.width,
                    height: '100%',
                    borderRight: '1px solid #EEF2FF',
                  }}
                >
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: '#94A3B8' }}
                  >
                    {def.label}
                  </span>
                  {def.removable && (
                    <button
                      onClick={() => toggleColumn(key)}
                      className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded transition-opacity"
                      style={{ color: '#CBD5E1' }}
                      title={`${def.label}を非表示`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )
            })}

            {/* Column picker */}
            <div ref={colMenuRef} className="absolute right-0 top-0 bottom-0 flex items-center pr-2">
              <button
                onClick={() => setShowColMenu((v) => !v)}
                className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
                style={{ color: '#CBD5E1' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#64748B' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#CBD5E1' }}
                title="カラム設定"
              >
                <SlidersHorizontal className="w-3 h-3" />
              </button>

              {showColMenu && (
                <div
                  className="absolute top-full right-0 mt-1.5 w-44 rounded-xl overflow-hidden animate-fade-in"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #EEF2FF',
                    boxShadow: '0 8px 24px rgba(15,23,42,0.1)',
                    zIndex: 50,
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-wider px-3 py-2"
                    style={{ color: '#94A3B8', borderBottom: '1px solid #F1F5F9' }}
                  >
                    表示カラム
                  </p>
                  {ALL_COL_KEYS.map((key) => {
                    const def = COL_DEFS[key]
                    const checked = ganttColumns.includes(key)
                    return (
                      <label
                        key={key}
                        className={`flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer transition-colors ${key === 'name' ? 'opacity-40' : 'hover:bg-slate-50'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={key === 'name'}
                          onChange={() => toggleColumn(key)}
                          className="w-3.5 h-3.5 rounded"
                          style={{ accentColor: '#6366F1' }}
                        />
                        <span style={{ color: '#334155' }}>{def.label}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Add button */}
            {canEdit && (
              <div className="absolute left-3 bottom-1.5">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-colors"
                  style={{ color: '#6366F1' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#EEF2FF' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
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
              if (row.type === 'empty') {
                const isInlineEditing = inlineRow === row.index
                return (
                  <div
                    key={`empty-${row.index}`}
                    className="flex items-center"
                    style={{
                      height: ROW_HEIGHT,
                      width: leftPanelWidth,
                      borderBottom: '1px solid #F8FAFC',
                    }}
                  >
                    {ganttColumns.map((key, colIdx) => {
                      const def = COL_DEFS[key]
                      if (colIdx === 0) {
                        return (
                          <div
                            key={key}
                            className="flex-shrink-0 flex items-center"
                            style={{
                              width: def.width,
                              height: '100%',
                              borderRight: '1px solid #F1F5F9',
                              paddingLeft: 28,
                              paddingRight: 8,
                            }}
                            onClick={() => {
                              if (canEdit && !isInlineEditing) setInlineRow(row.index)
                            }}
                          >
                            {isInlineEditing ? (
                              <input
                                autoFocus
                                type="text"
                                className="w-full text-xs rounded-md px-2 py-1 outline-none"
                                style={{
                                  background: '#EEF2FF',
                                  border: '1px solid #A5B4FC',
                                  color: '#0F172A',
                                }}
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
                          className="flex-shrink-0"
                          style={{
                            width: def.width,
                            height: '100%',
                            borderRight: '1px solid #F1F5F9',
                          }}
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
                    className="flex items-center"
                    style={{
                      height: ROW_HEIGHT,
                      width: leftPanelWidth,
                      background: 'linear-gradient(90deg, #F8FAFC, #FAFBFF)',
                      borderBottom: '1px solid #EEF2FF',
                      borderLeft: `3px solid ${row.phase.color}`,
                    }}
                  >
                    <div className="flex items-center gap-2 px-3" style={{ width: leftPanelWidth }}>
                      <span
                        className="text-xs font-bold uppercase tracking-wider truncate"
                        style={{ color: row.phase.color }}
                      >
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
                  className="flex items-center transition-colors"
                  style={{
                    height: ROW_HEIGHT,
                    background: isRowSelected ? '#EEF2FF' : undefined,
                    borderBottom: '1px solid #F8FAFC',
                  }}
                  onMouseEnter={(e) => { if (!isRowSelected) e.currentTarget.style.background = '#FAFBFF' }}
                  onMouseLeave={(e) => { if (!isRowSelected) e.currentTarget.style.background = 'transparent' }}
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
                        className={`flex-shrink-0 flex items-center overflow-hidden ${
                          isEditable && !isDateField ? 'cursor-text' : isEditable && isDateField ? 'cursor-pointer' : ''
                        }`}
                        style={{
                          width: def.width,
                          height: '100%',
                          borderRight: '1px solid #F1F5F9',
                          paddingLeft: colIdx === 0 ? 28 : 10,
                          paddingRight: 10,
                        }}
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
                            className="w-full text-xs rounded-md px-2 py-0.5 outline-none"
                            style={{
                              background: '#EEF2FF',
                              border: '1px solid #A5B4FC',
                              color: '#0F172A',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <>
                            {colIdx === 0 && (
                              <div
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0 mr-2.5"
                                style={{ backgroundColor: phaseColor }}
                              />
                            )}
                            <span
                              className="text-xs truncate"
                              style={{
                                color: key === 'updated_at' ? '#CBD5E1' : '#334155',
                                fontWeight: colIdx === 0 ? 500 : 400,
                              }}
                            >
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
            className="flex-shrink-0 overflow-hidden"
            style={{
              height: HEADER_HEIGHT,
              background: '#FAFBFF',
              borderBottom: '1px solid #EEF2FF',
            }}
          >
            <div className="relative" style={{ width: totalWidth, height: HEADER_HEIGHT }}>
              {/* Month/Year labels */}
              {zoomLevel !== 'month' && (
                <div className="absolute top-0 left-0 right-0 h-6 flex">
                  {columns
                    .filter((_, i) => i === 0 || columns[i].sublabel !== columns[i - 1].sublabel)
                    .map((col) => (
                      <div
                        key={col.date.toISOString()}
                        className="absolute top-0 pl-2 pt-1 text-xs font-semibold"
                        style={{ left: col.x, color: '#6366F1', fontSize: '11px' }}
                      >
                        {col.sublabel}
                      </div>
                    ))}
                </div>
              )}

              {/* Day/Week/Month cells */}
              <div
                className="absolute left-0 right-0 flex"
                style={{ top: zoomLevel !== 'month' ? 24 : 0, bottom: 0 }}
              >
                {columns.map((col) => (
                  <div
                    key={col.date.toISOString()}
                    className="absolute bottom-0 flex items-center justify-center text-xs font-medium"
                    style={{
                      left: col.x,
                      width: col.width,
                      top: 0,
                      borderRight: '1px solid #EEF2FF',
                      background: col.isToday
                        ? 'rgba(99,102,241,0.08)'
                        : (col as { isWeekend?: boolean }).isWeekend
                        ? 'rgba(148,163,184,0.04)'
                        : 'transparent',
                      color: col.isToday ? '#6366F1' : '#94A3B8',
                      fontWeight: col.isToday ? 700 : 400,
                    }}
                  >
                    {col.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scrollable body */}
          <div ref={scrollRef} className="flex-1 overflow-auto">
            <div className="relative" style={{ width: totalWidth, height: totalHeight }}>
              {/* Column grid lines */}
              {columns.map((col) => (
                <div
                  key={col.date.toISOString()}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: col.x,
                    width: col.width,
                    borderRight: '1px solid #F1F5F9',
                    background: col.isToday
                      ? 'rgba(99,102,241,0.04)'
                      : (col as { isWeekend?: boolean }).isWeekend
                      ? 'rgba(148,163,184,0.025)'
                      : 'transparent',
                  }}
                />
              ))}

              {/* Row separators */}
              {rows.map((_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0"
                  style={{
                    top: i * ROW_HEIGHT,
                    height: ROW_HEIGHT,
                    borderBottom: '1px solid #F8FAFC',
                  }}
                />
              ))}

              {/* Today line */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                  left: todayX,
                  width: 2,
                  background: 'linear-gradient(180deg, #6366F1 0%, rgba(99,102,241,0.3) 100%)',
                  zIndex: 10,
                }}
              />

              {/* Today dot at top */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: todayX - 4,
                  top: -1,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#6366F1',
                  zIndex: 11,
                }}
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
                const barColor = STATUS_COLORS[task.status] ?? phaseColor
                const barHeight = 22
                const top = i * ROW_HEIGHT + (ROW_HEIGHT - barHeight) / 2

                return (
                  <div
                    key={`bar-${task.id}`}
                    className={`absolute group ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${isDragging ? 'opacity-70 z-20' : ''}`}
                    style={{
                      left: x,
                      top,
                      width: Math.max(width, dayWidth),
                      height: barHeight,
                      borderRadius: 6,
                      background: `linear-gradient(135deg, ${barColor}dd, ${barColor}aa)`,
                      border: `1px solid ${barColor}`,
                      boxShadow: isDragging
                        ? `0 4px 12px ${barColor}55`
                        : `0 1px 3px ${barColor}33`,
                      transition: isDragging ? 'none' : 'box-shadow 150ms, filter 150ms',
                    }}
                    onMouseEnter={(e) => {
                      if (!isDragging) {
                        e.currentTarget.style.filter = 'brightness(1.1)'
                        e.currentTarget.style.boxShadow = `0 3px 8px ${barColor}55`
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = 'brightness(1)'
                      e.currentTarget.style.boxShadow = `0 1px 3px ${barColor}33`
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
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, task, 'resize-left') }}
                      />
                    )}

                    {/* Progress fill */}
                    <div
                      className="absolute left-0 top-0 bottom-0 rounded-l"
                      style={{
                        width: `${task.progress}%`,
                        background: 'rgba(255,255,255,0.25)',
                        borderRadius: task.progress >= 100 ? 5 : undefined,
                      }}
                    />

                    {/* Label */}
                    {width > 36 && (
                      <span
                        className="absolute inset-0 flex items-center px-2 text-xs font-semibold truncate pointer-events-none"
                        style={{ color: 'rgba(255,255,255,0.95)', fontSize: '11px' }}
                      >
                        {task.name}
                      </span>
                    )}

                    {/* Resize handle right */}
                    {canEdit && (
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
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
