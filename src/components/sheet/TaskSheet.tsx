'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTaskStore } from '@/store/taskStore'
import { useProjectStore } from '@/store/projectStore'
import type { Phase, Task } from '@/types'
import { Plus, X, GripVertical, Trash2 } from 'lucide-react'
import DatePickerPopup from '@/components/ui/DatePickerPopup'

const TOTAL_ROWS = 50

type EditingCell = { rowId: string; field: string }

const PHASE_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#3B82F6', '#EF4444', '#14B8A6',
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-2xl animate-slide-up"
        style={{ background: '#FFFFFF', boxShadow: '0 24px 64px rgba(15,23,42,0.2)' }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <h3 className="text-sm font-semibold" style={{ color: '#0F172A' }}>フェーズを追加</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: '#94A3B8' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div
              className="px-4 py-3 rounded-xl text-xs"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}
            >
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#64748B' }}>
              フェーズ名 <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              placeholder="例: 設計フェーズ"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
              style={{ border: '1.5px solid #E2E8F0', color: '#0F172A', background: '#FAFBFF' }}
              onFocus={(e) => { e.currentTarget.style.border = '1.5px solid #6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }}
              onBlur={(e) => { e.currentTarget.style.border = '1.5px solid #E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: '#64748B' }}>カラー</label>
            <div className="flex gap-2.5">
              {PHASE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    backgroundColor: c,
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                    boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2.5 text-sm font-medium rounded-xl transition-all"
              style={{ border: '1.5px solid #E2E8F0', color: '#64748B', background: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-3 py-2.5 text-sm font-semibold text-white rounded-xl transition-all"
              style={{
                background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                boxShadow: `0 2px 8px ${color}44`,
                opacity: loading || !name.trim() ? 0.6 : 1,
              }}
            >
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
          if (initialChar == null) e.target.select()
        }}
        onBlur={() => onCommit(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { onCancel(); return }
          onKeyDown?.(e)
        }}
        className="w-full px-3 py-2 text-xs border-0 outline-none"
        style={{ background: '#EEF2FF', color: '#0F172A' }}
        placeholder={placeholder}
        autoComplete="off"
      />
    )
  }

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSingleClick(e) }}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(e) }}
      className="px-3 py-2 text-xs cursor-default select-text min-h-[34px] flex items-center"
      style={{ color: '#334155' }}
    >
      {value || <span style={{ color: '#CBD5E1', fontSize: '11px' }}>{placeholder ?? ''}</span>}
    </div>
  )
}

// ─── Date Cell ────────────────────────────────────────────────────────────────
function DateCell({ value, canEdit, onOpen }: { value: string | null; canEdit: boolean; onOpen: (rect: DOMRect) => void }) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={ref}
      onClick={() => { if (canEdit && ref.current) onOpen(ref.current.getBoundingClientRect()) }}
      className="px-3 py-2 text-xs min-h-[34px] flex items-center transition-colors"
      style={{
        cursor: canEdit ? 'pointer' : 'default',
        color: value ? '#334155' : '#CBD5E1',
      }}
      onMouseEnter={(e) => { if (canEdit) e.currentTarget.style.background = '#F1F5F9' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      {value ? fmtDate(value) : '—'}
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

  const pct = Math.min(100, Math.max(0, value))
  const barColor = pct === 100 ? '#10B981' : pct > 50 ? '#6366F1' : pct > 0 ? '#F59E0B' : '#E2E8F0'

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
        className="w-full px-3 py-2 text-xs border-0 outline-none"
        style={{ background: '#EEF2FF', color: '#0F172A' }}
      />
    )
  }

  return (
    <div
      onClick={onStartEdit}
      className="px-3 py-2 cursor-text flex items-center gap-2 min-h-[34px] transition-colors"
      onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, background: '#E2E8F0' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      <span
        className="text-xs tabular-nums flex-shrink-0 font-medium"
        style={{ color: barColor === '#E2E8F0' ? '#94A3B8' : barColor, fontSize: '11px', minWidth: 28, textAlign: 'right' }}
      >
        {pct}%
      </span>
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

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

  const [datePicker, setDatePicker] = useState<{
    taskId: string
    field: 'start_date' | 'end_date'
    rect: DOMRect
  } | null>(null)

  const dragIdRef = useRef<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ id: string; pos: 'above' | 'below' } | null>(null)

  const canEdit = currentUserRole === 'owner' || currentUserRole === 'editor'

  const EDITABLE_COLS = ['name', 'start_date', 'end_date', 'progress'] as const
  type EditableCol = typeof EDITABLE_COLS[number]

  useEffect(() => {
    if (editing) {
      const key = `${editing.rowId}-${editing.field}`
      const el = inputRefs.current.get(key)
      if (el) {
        el.focus()
        if (editingInitialChar == null && el.type !== 'date' && el.type !== 'number') {
          el.select()
        }
      }
    }
  }, [editing, editingInitialChar])

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

  const deleteTask = useCallback(async (taskId: string) => {
    removeTask(taskId)
    setSelectedIds(prev => { const n = new Set(prev); n.delete(taskId); return n })
    try {
      await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' })
    } catch { /* ignore */ }
  }, [removeTask])

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
      if (!newName) { deleteTask(rowId); return }
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

  const handleRowClick = (e: React.MouseEvent, taskId: string) => {
    if (editing) return
    if (e.shiftKey && lastSelectedId) {
      const ids = tasks.map(t => t.id)
      const startIdx = ids.indexOf(lastSelectedId)
      const endIdx = ids.indexOf(taskId)
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
        setSelectedIds(new Set(ids.slice(from, to + 1)))
      }
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => {
        const n = new Set(prev)
        if (n.has(taskId)) n.delete(taskId)
        else n.add(taskId)
        return n
      })
      setLastSelectedId(taskId)
    } else {
      setSelectedIds(new Set([taskId]))
      setLastSelectedId(taskId)
    }
    tableRef.current?.focus()
  }

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
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const currentId = lastSelectedId ?? Array.from(selectedIds)[0]
      if (currentId) startEdit(currentId, 'name', e.key)
    }
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    dragIdRef.current = taskId
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const pos: 'above' | 'below' = e.clientY < rect.top + rect.height / 2 ? 'above' : 'below'
    setDropTarget({ id: taskId, pos })
  }

  const handleDrop = (e: React.DragEvent, dropTaskId: string | null) => {
    e.preventDefault()
    const dragId = dragIdRef.current
    if (!dragId || !currentProject) { setDropTarget(null); return }

    const ids = tasks.map(t => t.id)
    const dragIdx = ids.indexOf(dragId)
    if (dragIdx === -1) { setDropTarget(null); return }

    let newIds: string[]
    if (dropTaskId === null) {
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
    fetch('/api/tasks/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: currentProject.id, task_ids: newIds }),
    }).catch(() => {})

    setDropTarget(null)
    dragIdRef.current = null
  }

  const handleDragEnd = () => {
    dragIdRef.current = null
    setDropTarget(null)
  }

  const emptyCount = Math.max(0, TOTAL_ROWS - tasks.length)
  const emptyRows = Array.from({ length: emptyCount }, (_, i) => tasks.length + i)

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: '#64748B',
    background: '#F8FAFC',
    borderBottom: '1px solid #E2E8F0',
    borderRight: '1px solid #E2E8F0',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  }

  return (
    <div className="h-full flex flex-col" style={{ background: '#FFFFFF' }}>
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid #EEF2FF', background: '#FAFBFF' }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xs" style={{ color: '#94A3B8' }}>
            {tasks.length} タスク
          </span>
          {selectedIds.size > 0 && (
            <>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: '#EEF2FF', color: '#6366F1' }}
              >
                {selectedIds.size}件選択中
              </span>
              <button
                onClick={deleteSelected}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors"
                style={{ color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.04)' }}
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all"
            style={{
              color: '#6366F1',
              border: '1px solid rgba(99,102,241,0.25)',
              background: 'rgba(99,102,241,0.04)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(99,102,241,0.08)'
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(99,102,241,0.04)'
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'
            }}
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
          <thead className="sticky top-0 z-10">
            <tr>
              {canEdit && <th style={{ ...thStyle, width: 20 }} />}
              <th style={{ ...thStyle, width: 36, textAlign: 'center' }}>#</th>
              <th style={{ ...thStyle, minWidth: 200, textAlign: 'left' }}>タスク名</th>
              <th style={{ ...thStyle, width: 110, textAlign: 'left' }}>フェーズ</th>
              <th style={{ ...thStyle, width: 110, textAlign: 'left' }}>開始日</th>
              <th style={{ ...thStyle, width: 110, textAlign: 'left' }}>終了日</th>
              <th style={{ ...thStyle, width: 150, textAlign: 'left' }}>進捗率</th>
              <th style={{ ...thStyle, width: 110, textAlign: 'left', borderRight: 'none' }}>更新日</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, idx) => {
              const isSelected = selectedIds.has(task.id)
              const isDragTarget = dropTarget?.id === task.id
              const isDraggingThis = dragIdRef.current === task.id

              const rowStyle: React.CSSProperties = {
                background: isSelected ? '#EEF2FF' : editing?.rowId === task.id ? '#FAFBFF' : 'transparent',
                borderBottom: '1px solid #F1F5F9',
                opacity: isDraggingThis ? 0.5 : 1,
                outline: isDragTarget && dropTarget?.pos === 'above' ? '2px solid #6366F1' : undefined,
                outlineOffset: isDragTarget && dropTarget?.pos === 'above' ? '-1px' : undefined,
              }

              const tdStyle: React.CSSProperties = {
                borderRight: '1px solid #F1F5F9',
                padding: 0,
              }

              return (
                <tr
                  key={task.id}
                  style={rowStyle}
                  onClick={(e) => handleRowClick(e, task.id)}
                  onMouseEnter={(e) => { if (!isSelected && editing?.rowId !== task.id) e.currentTarget.style.background = '#FAFBFF' }}
                  onMouseLeave={(e) => { if (!isSelected && editing?.rowId !== task.id) e.currentTarget.style.background = 'transparent' }}
                  onDragOver={(e) => handleDragOver(e, task.id)}
                  onDrop={(e) => handleDrop(e, task.id)}
                  className="group"
                >
                  {canEdit && (
                    <td
                      style={{ ...tdStyle, width: 20, textAlign: 'center' }}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className="opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-grab active:cursor-grabbing h-full py-2"
                        style={{ transition: 'opacity 150ms' }}
                      >
                        <GripVertical className="w-3 h-3" style={{ color: '#CBD5E1' }} />
                      </div>
                    </td>
                  )}
                  <td style={{ ...tdStyle, width: 36, textAlign: 'center', background: '#FAFBFF' }}>
                    <div className="py-2 text-xs tabular-nums" style={{ color: '#94A3B8' }}>{idx + 1}</div>
                  </td>
                  <td style={tdStyle}>
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
                  <td style={tdStyle}>
                    {(() => {
                      const phase = task.phase_id ? phases.find(p => p.id === task.phase_id) : undefined
                      if (phase) {
                        return (
                          <div className="px-3 py-2 min-h-[34px] flex items-center gap-1.5">
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: phase.color ?? '#6366F1' }}
                            />
                            <span className="text-xs truncate" style={{ color: '#64748B' }}>{phase.name}</span>
                          </div>
                        )
                      }
                      return <div className="px-3 py-2 min-h-[34px]" />
                    })()}
                  </td>
                  <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                    <DateCell
                      value={task.start_date}
                      canEdit={canEdit}
                      onOpen={(rect) => setDatePicker({ taskId: task.id, field: 'start_date', rect })}
                    />
                  </td>
                  <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                    <DateCell
                      value={task.end_date}
                      canEdit={canEdit}
                      onOpen={(rect) => setDatePicker({ taskId: task.id, field: 'end_date', rect })}
                    />
                  </td>
                  <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                    <ProgressCell
                      value={task.progress ?? 0}
                      isEditing={editing?.rowId === task.id && editing.field === 'progress'}
                      onStartEdit={() => startEdit(task.id, 'progress')}
                      onCommit={(v) => commitEdit(task.id, 'progress', v)}
                      onKeyDown={(e) => handleEditKeyDown(e, task.id, 'progress')}
                      inputRef={{ current: null } as React.RefObject<HTMLInputElement | null>}
                    />
                  </td>
                  <td style={{ ...tdStyle, borderRight: 'none' }}>
                    <div className="px-3 py-2 text-xs min-h-[34px] flex items-center" style={{ color: '#CBD5E1' }}>
                      {fmtDate(task.updated_at)}
                    </div>
                  </td>
                </tr>
              )
            })}

            {/* Drop zone */}
            <tr
              style={{ height: 32 }}
              onDragOver={(e) => { e.preventDefault(); setDropTarget(null) }}
              onDrop={(e) => handleDrop(e, null)}
            >
              {canEdit && <td />}
              <td />
              <td colSpan={6} />
            </tr>

            {/* Empty rows */}
            {emptyRows.map((rowIndex) => {
              const emptyRowId = `empty-${rowIndex}`
              const isPending = pendingRows[rowIndex] !== undefined

              return (
                <tr
                  key={emptyRowId}
                  style={{ borderBottom: '1px solid #F8FAFC' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#FAFBFF' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  {canEdit && <td style={{ borderRight: '1px solid #F1F5F9', width: 20 }} />}
                  <td
                    style={{
                      borderRight: '1px solid #F1F5F9',
                      width: 36,
                      textAlign: 'center',
                      background: '#FAFBFF',
                    }}
                  >
                    <div className="py-2 text-xs tabular-nums" style={{ color: '#E2E8F0' }}>{rowIndex + 1}</div>
                  </td>
                  <td style={{ borderRight: '1px solid #F1F5F9', padding: 0 }}>
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
                        className="w-full px-3 py-2 text-xs border-0 outline-none min-h-[34px]"
                        style={{
                          background: isPending ? '#EEF2FF' : 'transparent',
                          color: '#0F172A',
                          transition: 'background 150ms',
                        }}
                        onFocus={(e) => { e.currentTarget.style.background = '#EEF2FF' }}
                        onBlurCapture={(e) => { if (!e.target.value) e.currentTarget.style.background = 'transparent' }}
                      />
                    ) : (
                      <div className="px-3 py-2 min-h-[34px]" />
                    )}
                  </td>
                  <td style={{ borderRight: '1px solid #F1F5F9', minHeight: 34 }} />
                  <td style={{ borderRight: '1px solid #F1F5F9', minHeight: 34 }} />
                  <td style={{ borderRight: '1px solid #F1F5F9', minHeight: 34 }} />
                  <td style={{ borderRight: '1px solid #F1F5F9', minHeight: 34 }} />
                  <td style={{ minHeight: 34 }} />
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
