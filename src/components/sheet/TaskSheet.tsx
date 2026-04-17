'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTaskStore } from '@/store/taskStore'
import { useProjectStore } from '@/store/projectStore'
import type { Phase, Task } from '@/types'
import { Plus, X, GripVertical, Trash2 } from 'lucide-react'
import DatePickerPopup from '@/components/ui/DatePickerPopup'

// ─── Constants ────────────────────────────────────────────────────────────────
const TOTAL_ROWS = 50   // Excel-like: always show this many rows

// ─── Types ────────────────────────────────────────────────────────────────────
type EditingCell = { rowId: string; field: string }

const PHASE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
]

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

// ─── Add Phase Modal ──────────────────────────────────────────────────────────
function AddPhaseModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { upsertPhase } = useTaskStore()
  const [name, setName] = useState('')
  const [color, setColor] = useState(PHASE_COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, name: name.trim(), color }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'フェーズの作成に失敗しました')
      upsertPhase(data as Phase)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">フェーズ追加</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              フェーズ名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              placeholder="例: 設計フェーズ"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">カラー</label>
            <div className="flex gap-2 flex-wrap">
              {PHASE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-all hover:scale-110"
                  style={{ backgroundColor: c, outline: color === c ? `3px solid ${c}` : 'none', outlineOffset: '2px' }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              キャンセル
            </button>
            <button type="submit" disabled={loading || !name.trim()}
              className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? '作成中...' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

// ─── Editable Name Cell ───────────────────────────────────────────────────────
function EditableNameCell({
  value,
  isEditing,
  onSingleClick,
  onDoubleClick,
  onCommit,
  onCancel,
  onKeyDown,
  inputRef,
  placeholder,
  initialChar,
}: {
  value: string
  isEditing: boolean
  onSingleClick: (e: React.MouseEvent) => void
  onDoubleClick: (e: React.MouseEvent) => void
  onCommit: (val: string) => void
  onCancel: () => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  inputRef?: React.RefObject<HTMLInputElement | null>
  placeholder?: string
  initialChar?: string | null
}) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (isEditing) {
      setDraft(initialChar != null ? initialChar : value)
    }
  }, [isEditing, value, initialChar])

  if (isEditing) {
    return (
      <input
        autoFocus
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => {
          // ダブルクリック時は全選択、キー入力時は末尾にカーソル
          if (initialChar == null) e.target.select()
        }}
        onBlur={() => onCommit(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { onCancel(); return }
          onKeyDown?.(e)
        }}
        className="w-full px-2 py-2 text-xs text-gray-900 bg-blue-50 border-0 outline-none focus:bg-blue-50"
        placeholder={placeholder}
        autoComplete="off"
      />
    )
  }

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSingleClick(e) }}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(e) }}
      className="px-2 py-2 text-xs text-gray-800 cursor-default select-text min-h-[34px] flex items-center"
    >
      {value || <span className="text-gray-300 text-xs">{placeholder ?? ''}</span>}
    </div>
  )
}

// ─── Date Cell ────────────────────────────────────────────────────────────────
function DateCell({
  value,
  canEdit,
  onOpen,
}: {
  value: string | null
  canEdit: boolean
  onOpen: (rect: DOMRect) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  const handleClick = () => {
    if (!canEdit) return
    if (ref.current) {
      onOpen(ref.current.getBoundingClientRect())
    }
  }

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className={`px-2 py-2 text-xs min-h-[34px] flex items-center ${
        canEdit ? 'cursor-pointer hover:bg-blue-50/40' : ''
      } ${value ? 'text-gray-800' : 'text-gray-300'}`}
    >
      {value ? fmtDate(value) : '-'}
    </div>
  )
}

// ─── Progress Cell ────────────────────────────────────────────────────────────
function ProgressCell({
  value,
  isEditing,
  onStartEdit,
  onCommit,
  onKeyDown,
  inputRef,
}: {
  value: number
  isEditing: boolean
  onStartEdit: () => void
  onCommit: (val: number) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  inputRef?: React.RefObject<HTMLInputElement | null>
}) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    if (isEditing) setDraft(String(value))
  }, [isEditing, value])

  if (isEditing) {
    return (
      <input
        autoFocus
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="number"
        min={0}
        max={100}
        step={5}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommit(Math.min(100, Math.max(0, Number(draft) || 0)))}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { onCommit(value); return }
          onKeyDown?.(e)
        }}
        className="w-full px-2 py-2 text-xs text-gray-900 bg-blue-50 border-0 outline-none"
      />
    )
  }

  return (
    <div
      onClick={onStartEdit}
      className="px-2 py-2 cursor-text hover:bg-blue-50/40 flex items-center gap-1.5 min-h-[34px]"
    >
      <div className="flex-1 bg-gray-200 rounded-full h-1">
        <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-gray-600 w-8 text-right tabular-nums flex-shrink-0">{value}%</span>
    </div>
  )
}

// ─── Main TaskSheet ───────────────────────────────────────────────────────────
export default function TaskSheet() {
  const { tasks, phases, upsertTask, removeTask, reorderTasks } = useTaskStore()
  const { currentProject, currentUserRole } = useProjectStore()
  const [editing, setEditing] = useState<EditingCell | null>(null)
  const [editingInitialChar, setEditingInitialChar] = useState<string | null>(null)
  const [showPhaseModal, setShowPhaseModal] = useState(false)
  const [pendingRows, setPendingRows] = useState<Record<number, string>>({})
  const inputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map())
  const tableRef = useRef<HTMLDivElement>(null)

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

  // Date picker state
  const [datePicker, setDatePicker] = useState<{
    taskId: string
    field: 'start_date' | 'end_date'
    rect: DOMRect
  } | null>(null)

  // Drag-to-reorder state
  const dragIdRef = useRef<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ id: string; pos: 'above' | 'below' } | null>(null)

  const canEdit = currentUserRole === 'owner' || currentUserRole === 'editor'

  const EDITABLE_COLS = ['name', 'start_date', 'end_date', 'progress'] as const
  type EditableCol = typeof EDITABLE_COLS[number]

  // ── Focus input after render ──────────────────────────────────────────────
  useEffect(() => {
    if (editing) {
      const key = `${editing.rowId}-${editing.field}`
      const el = inputRefs.current.get(key)
      if (el) {
        el.focus()
        if (editingInitialChar != null) {
          // typed a char — cursor at end
        } else if (el.type !== 'date' && el.type !== 'number') {
          el.select()
        }
      }
    }
  }, [editing, editingInitialChar])

  // ── PATCH existing task ──────────────────────────────────────────────────
  const patchTask = useCallback(async (taskId: string, field: string, value: unknown) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    upsertTask({ ...task, [field]: value, updated_at: new Date().toISOString() })
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, [field]: value, version: task.version }),
      })
      if (!res.ok) { upsertTask(task) }
      else { upsertTask(await res.json()) }
    } catch {
      upsertTask(task)
    }
  }, [tasks, upsertTask])

  // ── DELETE task ──────────────────────────────────────────────────────────
  const deleteTask = useCallback(async (taskId: string) => {
    removeTask(taskId)
    setSelectedIds(prev => { const n = new Set(prev); n.delete(taskId); return n })
    try {
      await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' })
    } catch {
      // rollback handled by realtime
    }
  }, [removeTask])

  // ── DELETE selected tasks ────────────────────────────────────────────────
  const deleteSelected = useCallback(async () => {
    const ids = Array.from(selectedIds)
    ids.forEach(id => removeTask(id))
    setSelectedIds(new Set())
    setLastSelectedId(null)
    for (const id of ids) {
      try {
        await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' })
      } catch { /* ignore */ }
    }
  }, [selectedIds, removeTask])

  // ── POST new task from an empty row ─────────────────────────────────────
  const createTask = useCallback(async (rowIndex: number, name: string) => {
    if (!currentProject || !name.trim()) {
      setPendingRows(prev => { const n = { ...prev }; delete n[rowIndex]; return n })
      return
    }
    setPendingRows(prev => { const n = { ...prev }; delete n[rowIndex]; return n })
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: currentProject.id, name: name.trim() }),
      })
      if (res.ok) upsertTask(await res.json())
    } catch { /* ignore */ }
  }, [currentProject, upsertTask])

  // ── Keyboard nav (Tab/Enter) for editing ─────────────────────────────────
  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, rowId: string, field: EditableCol) => {
      if (e.key !== 'Enter' && e.key !== 'Tab') return
      e.preventDefault()
      const colIdx = EDITABLE_COLS.indexOf(field)
      if (colIdx < EDITABLE_COLS.length - 1) {
        setEditingInitialChar(null)
        setEditing({ rowId, field: EDITABLE_COLS[colIdx + 1] })
      } else {
        setEditing(null)
        setEditingInitialChar(null)
      }
    },
    [EDITABLE_COLS]
  )

  const startEdit = (rowId: string, field: EditableCol, initialChar?: string) => {
    if (!canEdit) return
    setEditingInitialChar(initialChar ?? null)
    setEditing({ rowId, field })
  }

  const commitEdit = (rowId: string, field: EditableCol, value: unknown) => {
    setEditing(null)
    setEditingInitialChar(null)
    const task = tasks.find(t => t.id === rowId)
    if (!task) return
    if (field === 'name') {
      const newName = String(value).trim()
      if (!newName) {
        deleteTask(rowId)
        return
      }
    }
    const current = task[field as keyof typeof task]
    if (current !== value) patchTask(rowId, field, value === '' ? null : value)
  }

  const cancelEdit = () => {
    setEditing(null)
    setEditingInitialChar(null)
    tableRef.current?.focus()
  }

  const getRef = (rowId: string, field: string) => {
    return (el: HTMLInputElement | null) => {
      inputRefs.current.set(`${rowId}-${field}`, el)
    }
  }

  // ── Row selection helpers ─────────────────────────────────────────────────
  const handleRowClick = (e: React.MouseEvent, taskId: string) => {
    if (editing) return // don't interfere with editing

    if (e.shiftKey && lastSelectedId) {
      // Range select
      const ids = tasks.map(t => t.id)
      const startIdx = ids.indexOf(lastSelectedId)
      const endIdx = ids.indexOf(taskId)
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
        const rangeIds = ids.slice(from, to + 1)
        setSelectedIds(new Set(rangeIds))
      }
    } else if (e.ctrlKey || e.metaKey) {
      // Toggle
      setSelectedIds(prev => {
        const n = new Set(prev)
        if (n.has(taskId)) n.delete(taskId)
        else n.add(taskId)
        return n
      })
      setLastSelectedId(taskId)
    } else {
      // Single select
      setSelectedIds(new Set([taskId]))
      setLastSelectedId(taskId)
    }

    tableRef.current?.focus()
  }

  // ── Table-level keydown (when table has focus) ────────────────────────────
  const handleTableKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (editing) return

    if (e.key === 'Escape') {
      setSelectedIds(new Set())
      setLastSelectedId(null)
      return
    }

    if (selectedIds.size === 0) return

    const taskIds = tasks.map(t => t.id)

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const currentId = lastSelectedId ?? Array.from(selectedIds)[0]
      const idx = taskIds.indexOf(currentId)
      const nextIdx = e.key === 'ArrowDown' ? Math.min(idx + 1, tasks.length - 1) : Math.max(idx - 1, 0)
      const nextId = taskIds[nextIdx]
      if (nextId) {
        setSelectedIds(new Set([nextId]))
        setLastSelectedId(nextId)
      }
      return
    }

    if (e.key === 'F2') {
      e.preventDefault()
      const currentId = lastSelectedId ?? Array.from(selectedIds)[0]
      if (currentId) startEdit(currentId, 'name')
      return
    }

    // Printable key → start edit with that char
    if (
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      const currentId = lastSelectedId ?? Array.from(selectedIds)[0]
      if (currentId) {
        startEdit(currentId, 'name', e.key)
      }
    }
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    dragIdRef.current = taskId
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const pos: 'above' | 'below' = e.clientY < midY ? 'above' : 'below'
    setDropTarget({ id: taskId, pos })
  }

  const handleDrop = (e: React.DragEvent, dropTaskId: string | null) => {
    e.preventDefault()
    const dragId = dragIdRef.current
    if (!dragId || !currentProject) {
      setDropTarget(null)
      return
    }

    const ids = tasks.map(t => t.id)
    const dragIdx = ids.indexOf(dragId)
    if (dragIdx === -1) { setDropTarget(null); return }

    let newIds: string[]

    if (dropTaskId === null) {
      // Dropped in empty space — move to end
      newIds = [...ids.filter(id => id !== dragId), dragId]
    } else {
      const dropIdx = ids.indexOf(dropTaskId)
      if (dropIdx === -1 || dragId === dropTaskId) { setDropTarget(null); return }

      const pos = dropTarget?.pos ?? 'below'
      const filtered = ids.filter(id => id !== dragId)
      const insertAt = filtered.indexOf(dropTaskId) + (pos === 'below' ? 1 : 0)
      filtered.splice(insertAt, 0, dragId)
      newIds = filtered
    }

    reorderTasks(newIds)

    // Persist
    fetch('/api/tasks/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: currentProject.id, task_ids: newIds }),
    }).catch(() => { /* optimistic, ignore errors */ })

    setDropTarget(null)
    dragIdRef.current = null
  }

  const handleDragEnd = () => {
    dragIdRef.current = null
    setDropTarget(null)
  }

  // ── Build row list: tasks + empty rows up to TOTAL_ROWS ──────────────────
  const emptyCount = Math.max(0, TOTAL_ROWS - tasks.length)
  const emptyRows = Array.from({ length: emptyCount }, (_, i) => tasks.length + i)

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{tasks.length} タスク</span>
          {selectedIds.size > 0 && (
            <>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {selectedIds.size}件選択中
              </span>
              <button
                onClick={deleteSelected}
                className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                削除
              </button>
            </>
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => setShowPhaseModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            フェーズ追加
          </button>
        )}
      </div>

      {/* Table */}
      <div
        ref={tableRef}
        className="flex-1 overflow-auto outline-none"
        tabIndex={0}
        onKeyDown={handleTableKeyDown}
      >
        <table className="w-full border-collapse text-xs select-none">
          <thead className="sticky top-0 z-10 bg-[#f2f2f2]">
            <tr>
              {/* Drag handle column */}
              {canEdit && <th className="w-4 border-b border-r border-gray-300 bg-[#f2f2f2]" />}
              {/* Row number */}
              <th className="w-9 border-b border-r border-gray-300 text-center py-2 text-xs text-gray-400 font-normal bg-[#f2f2f2]" />
              <th className="text-left px-2 py-2 font-semibold text-gray-600 border-b border-r border-gray-300 min-w-[200px]">タスク名</th>
              <th className="text-left px-2 py-2 font-semibold text-gray-600 border-b border-r border-gray-300 w-28">フェーズ</th>
              <th className="text-left px-2 py-2 font-semibold text-gray-600 border-b border-r border-gray-300 w-[110px]">開始日</th>
              <th className="text-left px-2 py-2 font-semibold text-gray-600 border-b border-r border-gray-300 w-[110px]">終了日</th>
              <th className="text-left px-2 py-2 font-semibold text-gray-600 border-b border-r border-gray-300 w-[140px]">進捗率</th>
              <th className="text-left px-2 py-2 font-semibold text-gray-600 border-b border-gray-300 w-[110px]">更新日</th>
            </tr>
          </thead>
          <tbody>
            {/* ── Existing tasks ── */}
            {tasks.map((task, idx) => {
              const isSelected = selectedIds.has(task.id)
              const isDragTarget = dropTarget?.id === task.id
              const isDraggingThis = dragIdRef.current === task.id

              return (
                <tr
                  key={task.id}
                  className={`border-b border-gray-200 group ${
                    isSelected
                      ? 'bg-[#e8f0fe]'
                      : editing?.rowId === task.id
                      ? 'bg-white'
                      : 'hover:bg-[#e8f0fe]/30'
                  } ${isDragTarget && dropTarget?.pos === 'above' ? 'border-t-2 border-t-blue-500' : ''}
                  ${isDragTarget && dropTarget?.pos === 'below' ? 'border-b-2 border-b-blue-500' : ''}
                  ${isDraggingThis ? 'opacity-50' : ''}`}
                  onClick={(e) => handleRowClick(e, task.id)}
                  onDragOver={(e) => handleDragOver(e, task.id)}
                  onDrop={(e) => handleDrop(e, task.id)}
                >
                  {/* Drag handle */}
                  {canEdit && (
                    <td
                      className="border-r border-gray-200 w-4 text-center select-none"
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-3 h-3 text-gray-400" />
                      </div>
                    </td>
                  )}
                  {/* Row number */}
                  <td className="border-r border-gray-200 text-center text-xs text-gray-400 py-2 bg-[#f8f8f8] w-9 select-none">
                    {idx + 1}
                  </td>
                  {/* タスク名 */}
                  <td className="border-r border-gray-200 p-0">
                    <EditableNameCell
                      value={task.name}
                      isEditing={editing?.rowId === task.id && editing.field === 'name'}
                      onSingleClick={(e) => handleRowClick(e, task.id)}
                      onDoubleClick={() => startEdit(task.id, 'name')}
                      onCommit={(v) => commitEdit(task.id, 'name', v)}
                      onCancel={cancelEdit}
                      onKeyDown={(e) => handleEditKeyDown(e, task.id, 'name')}
                      inputRef={{ current: null } as React.RefObject<HTMLInputElement | null>}
                      placeholder="タスク名"
                      initialChar={editing?.rowId === task.id && editing.field === 'name' ? editingInitialChar : null}
                    />
                  </td>
                  {/* フェーズ */}
                  <td className="border-r border-gray-200 p-0">
                    {(() => {
                      const phase = task.phase_id ? phases.find(p => p.id === task.phase_id) : undefined
                      if (phase) {
                        return (
                          <div className="px-2 py-2 min-h-[34px] flex items-center gap-1">
                            <span style={{ color: phase.color ?? '#6366f1' }} className="text-xs leading-none">●</span>
                            <span className="text-gray-600 text-xs truncate">{phase.name}</span>
                          </div>
                        )
                      }
                      return <div className="px-2 py-2 min-h-[34px]" />
                    })()}
                  </td>
                  {/* 開始日 */}
                  <td className="border-r border-gray-200 p-0" onClick={(e) => e.stopPropagation()}>
                    <DateCell
                      value={task.start_date}
                      canEdit={canEdit}
                      onOpen={(rect) => setDatePicker({ taskId: task.id, field: 'start_date', rect })}
                    />
                  </td>
                  {/* 終了日 */}
                  <td className="border-r border-gray-200 p-0" onClick={(e) => e.stopPropagation()}>
                    <DateCell
                      value={task.end_date}
                      canEdit={canEdit}
                      onOpen={(rect) => setDatePicker({ taskId: task.id, field: 'end_date', rect })}
                    />
                  </td>
                  {/* 進捗率 */}
                  <td className="border-r border-gray-200 p-0" onClick={(e) => e.stopPropagation()}>
                    <ProgressCell
                      value={task.progress ?? 0}
                      isEditing={editing?.rowId === task.id && editing.field === 'progress'}
                      onStartEdit={() => startEdit(task.id, 'progress')}
                      onCommit={(v) => commitEdit(task.id, 'progress', v)}
                      onKeyDown={(e) => handleEditKeyDown(e, task.id, 'progress')}
                      inputRef={{ current: null } as React.RefObject<HTMLInputElement | null>}
                    />
                  </td>
                  {/* 更新日 */}
                  <td className="p-0">
                    <div className="px-2 py-2 text-xs text-gray-400 min-h-[34px] flex items-center">
                      {fmtDate(task.updated_at)}
                    </div>
                  </td>
                </tr>
              )
            })}

            {/* Drop zone for empty area after tasks */}
            <tr
              className="h-8"
              onDragOver={(e) => { e.preventDefault(); setDropTarget(null) }}
              onDrop={(e) => handleDrop(e, null)}
            >
              {canEdit && <td />}
              <td />
              <td colSpan={6} />
            </tr>

            {/* ── Empty rows (Excel-like) ── */}
            {emptyRows.map((rowIndex) => {
              const emptyRowId = `empty-${rowIndex}`
              const isPending = pendingRows[rowIndex] !== undefined
              return (
                <tr
                  key={emptyRowId}
                  className="border-b border-gray-200 hover:bg-[#e8f0fe]/20"
                >
                  {/* No drag handle for empty rows */}
                  {canEdit && <td className="border-r border-gray-200 w-4" />}
                  {/* Row number */}
                  <td className="border-r border-gray-200 text-center text-xs text-gray-400 py-2 bg-[#f8f8f8] w-9 select-none">
                    {rowIndex + 1}
                  </td>
                  {/* タスク名（入力可）*/}
                  <td className="border-r border-gray-200 p-0" colSpan={1}>
                    {canEdit ? (
                      <input
                        ref={getRef(emptyRowId, 'name')}
                        type="text"
                        value={pendingRows[rowIndex] ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          setPendingRows(prev => ({ ...prev, [rowIndex]: v }))
                        }}
                        onBlur={(e) => {
                          const v = e.target.value.trim()
                          if (v) createTask(rowIndex, v)
                          else setPendingRows(prev => { const n = { ...prev }; delete n[rowIndex]; return n })
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const target = e.target as HTMLInputElement
                            const v = target.value.trim()
                            target.value = ''
                            setPendingRows(prev => { const n = { ...prev }; delete n[rowIndex]; return n })
                            if (v) createTask(rowIndex, v)
                            target.blur()
                          }
                          if (e.key === 'Escape') {
                            const target = e.target as HTMLInputElement
                            target.value = ''
                            setPendingRows(prev => { const n = { ...prev }; delete n[rowIndex]; return n })
                            target.blur()
                          }
                        }}
                        className={`w-full px-2 py-2 text-xs text-gray-900 border-0 outline-none bg-transparent focus:bg-blue-50 min-h-[34px] ${isPending ? 'bg-blue-50' : ''}`}
                        placeholder=""
                      />
                    ) : (
                      <div className="px-2 py-2 min-h-[34px]" />
                    )}
                  </td>
                  {/* 残列は空 */}
                  <td className="border-r border-gray-200 min-h-[34px]" />
                  <td className="border-r border-gray-200 min-h-[34px]" />
                  <td className="border-r border-gray-200 min-h-[34px]" />
                  <td className="border-r border-gray-200 min-h-[34px]" />
                  <td className="min-h-[34px]" />
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showPhaseModal && currentProject && (
        <AddPhaseModal
          projectId={currentProject.id}
          onClose={() => setShowPhaseModal(false)}
        />
      )}

      {/* Date picker popup */}
      {datePicker && (
        <DatePickerPopup
          value={
            datePicker.field === 'start_date'
              ? tasks.find(t => t.id === datePicker.taskId)?.start_date ?? null
              : tasks.find(t => t.id === datePicker.taskId)?.end_date ?? null
          }
          anchorRect={datePicker.rect}
          onChange={(date) => {
            patchTask(datePicker.taskId, datePicker.field, date)
          }}
          onClose={() => setDatePicker(null)}
        />
      )}
    </div>
  )
}
