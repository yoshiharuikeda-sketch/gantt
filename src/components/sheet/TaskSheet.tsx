'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTaskStore } from '@/store/taskStore'
import { useProjectStore } from '@/store/projectStore'
import type { Phase } from '@/types'
import { Plus, X } from 'lucide-react'

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

// ─── Editable Cell ────────────────────────────────────────────────────────────
function EditableCell({
  value,
  type = 'text',
  readOnly = false,
  isEditing,
  onStartEdit,
  onCommit,
  onKeyDown,
  inputRef,
  placeholder,
}: {
  value: string
  type?: 'text' | 'date' | 'number'
  readOnly?: boolean
  isEditing: boolean
  onStartEdit: () => void
  onCommit: (val: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  inputRef?: React.RefObject<HTMLInputElement | null>
  placeholder?: string
}) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (isEditing) setDraft(value)
  }, [isEditing, value])

  if (readOnly) {
    return <div className="px-2 py-2 text-xs text-gray-500 select-text min-h-[34px] flex items-center">{value}</div>
  }

  const displayValue = type === 'date' ? fmtDate(value) : value

  if (isEditing) {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommit(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { onCommit(value); return }
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
      onClick={onStartEdit}
      className="px-2 py-2 text-xs text-gray-800 cursor-text hover:bg-blue-50/40 select-text min-h-[34px] flex items-center"
    >
      {displayValue || <span className="text-gray-300 text-xs">{placeholder ?? (type === 'date' ? '' : '')}</span>}
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
  const { tasks, phases, upsertTask, removeTask } = useTaskStore()
  const { currentProject, currentUserRole } = useProjectStore()
  const [editing, setEditing] = useState<EditingCell | null>(null)
  const [showPhaseModal, setShowPhaseModal] = useState(false)
  // Track which empty rows are being actively typed in (before task creation)
  const [pendingRows, setPendingRows] = useState<Record<number, string>>({})
  const inputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map())

  const canEdit = currentUserRole === 'owner' || currentUserRole === 'editor'

  const COLS = ['name', 'phase', 'start_date', 'end_date', 'progress', 'updated_at'] as const
  type ColKey = typeof COLS[number]
  const EDITABLE_COLS: ColKey[] = ['name', 'start_date', 'end_date', 'progress']

  // ── Focus input after render ──────────────────────────────────────────────
  useEffect(() => {
    if (editing) {
      const key = `${editing.rowId}-${editing.field}`
      const el = inputRefs.current.get(key)
      if (el) { el.focus(); if (el.type !== 'date' && el.type !== 'number') el.select() }
    }
  }, [editing])

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

  // ── DELETE task (name cleared) ──────────────────────────────────────────
  const deleteTask = useCallback(async (taskId: string) => {
    removeTask(taskId)
    try {
      await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' })
    } catch {
      // rollback handled by realtime
    }
  }, [removeTask])

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

  // ── Keyboard nav (Tab/Enter) ─────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, rowId: string, field: ColKey) => {
      if (e.key !== 'Enter' && e.key !== 'Tab') return
      e.preventDefault()
      const colIdx = EDITABLE_COLS.indexOf(field)
      if (colIdx < EDITABLE_COLS.length - 1) {
        setEditing({ rowId, field: EDITABLE_COLS[colIdx + 1] })
      } else {
        setEditing(null)
      }
    },
    [EDITABLE_COLS]
  )

  const startEdit = (rowId: string, field: ColKey) => {
    if (!canEdit) return
    if (field === 'updated_at' || field === 'phase') return
    setEditing({ rowId, field })
  }

  const commitEdit = (rowId: string, field: ColKey, value: unknown) => {
    setEditing(null)
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

  const getRef = (rowId: string, field: string) => {
    return (el: HTMLInputElement | null) => {
      inputRefs.current.set(`${rowId}-${field}`, el)
    }
  }

  // ── Build row list: tasks + empty rows up to TOTAL_ROWS ──────────────────
  const emptyCount = Math.max(0, TOTAL_ROWS - tasks.length)
  const emptyRows = Array.from({ length: emptyCount }, (_, i) => tasks.length + i)

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 flex-shrink-0">
        <span className="text-xs text-gray-400">{tasks.length} タスク</span>
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
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs select-none">
          <thead className="sticky top-0 z-10 bg-[#f2f2f2]">
            <tr>
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
            {tasks.map((task, idx) => (
              <tr
                key={task.id}
                className={`border-b border-gray-200 group ${editing?.rowId === task.id ? 'bg-white' : 'hover:bg-[#e8f0fe]/30'}`}
              >
                {/* Row number */}
                <td className="border-r border-gray-200 text-center text-xs text-gray-400 py-2 bg-[#f8f8f8] w-9 select-none">
                  {idx + 1}
                </td>
                {/* タスク名 */}
                <td className="border-r border-gray-200 p-0">
                  <EditableCell
                    value={task.name}
                    isEditing={editing?.rowId === task.id && editing.field === 'name'}
                    onStartEdit={() => startEdit(task.id, 'name')}
                    onCommit={(v) => commitEdit(task.id, 'name', v)}
                    onKeyDown={(e) => handleKeyDown(e, task.id, 'name')}
                    inputRef={{ current: null } as React.RefObject<HTMLInputElement | null>}
                    placeholder="タスク名"
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
                <td className="border-r border-gray-200 p-0">
                  <EditableCell
                    value={task.start_date ?? ''}
                    type="date"
                    isEditing={editing?.rowId === task.id && editing.field === 'start_date'}
                    onStartEdit={() => startEdit(task.id, 'start_date')}
                    onCommit={(v) => commitEdit(task.id, 'start_date', v)}
                    onKeyDown={(e) => handleKeyDown(e, task.id, 'start_date')}
                    inputRef={{ current: null } as React.RefObject<HTMLInputElement | null>}
                  />
                </td>
                {/* 終了日 */}
                <td className="border-r border-gray-200 p-0">
                  <EditableCell
                    value={task.end_date ?? ''}
                    type="date"
                    isEditing={editing?.rowId === task.id && editing.field === 'end_date'}
                    onStartEdit={() => startEdit(task.id, 'end_date')}
                    onCommit={(v) => commitEdit(task.id, 'end_date', v)}
                    onKeyDown={(e) => handleKeyDown(e, task.id, 'end_date')}
                    inputRef={{ current: null } as React.RefObject<HTMLInputElement | null>}
                  />
                </td>
                {/* 進捗率 */}
                <td className="border-r border-gray-200 p-0">
                  <ProgressCell
                    value={task.progress ?? 0}
                    isEditing={editing?.rowId === task.id && editing.field === 'progress'}
                    onStartEdit={() => startEdit(task.id, 'progress')}
                    onCommit={(v) => commitEdit(task.id, 'progress', v)}
                    onKeyDown={(e) => handleKeyDown(e, task.id, 'progress')}
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
            ))}

            {/* ── Empty rows (Excel-like) ── */}
            {emptyRows.map((rowIndex) => {
              const emptyRowId = `empty-${rowIndex}`
              const isPending = pendingRows[rowIndex] !== undefined
              return (
                <tr
                  key={emptyRowId}
                  className="border-b border-gray-200 hover:bg-[#e8f0fe]/20"
                >
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
                            const v = (e.target as HTMLInputElement).value.trim()
                            if (v) createTask(rowIndex, v)
                            else setPendingRows(prev => { const n = { ...prev }; delete n[rowIndex]; return n })
                          }
                          if (e.key === 'Escape') {
                            setPendingRows(prev => { const n = { ...prev }; delete n[rowIndex]; return n })
                            ;(e.target as HTMLInputElement).blur()
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
    </div>
  )
}
