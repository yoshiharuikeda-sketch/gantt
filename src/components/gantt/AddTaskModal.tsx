'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useTaskStore } from '@/store/taskStore'
import { useProjectStore } from '@/store/projectStore'
import type { Task, Phase } from '@/types'

interface AddTaskModalProps {
  onClose: () => void
}

const PHASE_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#3B82F6', '#EF4444', '#14B8A6',
]

export default function AddTaskModal({ onClose }: AddTaskModalProps) {
  const { phases, upsertTask, upsertPhase } = useTaskStore()
  const { currentProject, members } = useProjectStore()

  const [tab, setTab] = useState<'task' | 'phase'>('task')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [taskName, setTaskName] = useState('')
  const [taskPhaseId, setTaskPhaseId] = useState<string>('')
  const [taskStartDate, setTaskStartDate] = useState('')
  const [taskEndDate, setTaskEndDate] = useState('')
  const [taskAssigneeId, setTaskAssigneeId] = useState<string>('')

  const [phaseName, setPhaseName] = useState('')
  const [phaseColor, setPhaseColor] = useState(PHASE_COLORS[0])
  const [phaseStartDate, setPhaseStartDate] = useState('')
  const [phaseEndDate, setPhaseEndDate] = useState('')

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 10,
    border: '1.5px solid #E2E8F0',
    fontSize: '13px',
    color: '#0F172A',
    background: '#FAFBFF',
    outline: 'none',
    transition: 'border-color 150ms, box-shadow 150ms',
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProject || !taskName.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: currentProject.id,
          name: taskName.trim(),
          phase_id: taskPhaseId || null,
          start_date: taskStartDate || null,
          end_date: taskEndDate || null,
          assignee_id: taskAssigneeId || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'タスクの作成に失敗しました')
      }

      const task: Task = await res.json()
      upsertTask(task)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPhase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentProject || !phaseName.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: currentProject.id,
          name: phaseName.trim(),
          color: phaseColor,
          start_date: phaseStartDate || null,
          end_date: phaseEndDate || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'フェーズの作成に失敗しました')
      }

      const phase: Phase = await res.json()
      upsertPhase(phase)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md mx-4 rounded-2xl animate-slide-up"
        style={{
          background: '#FFFFFF',
          boxShadow: '0 24px 64px rgba(15,23,42,0.2)',
        }}
      >
        {/* Header with tabs */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #F1F5F9' }}
        >
          <div
            className="flex items-center rounded-xl p-1"
            style={{ background: '#F1F5F9' }}
          >
            {[
              { key: 'task' as const, label: 'タスク追加' },
              { key: 'phase' as const, label: 'フェーズ追加' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setTab(key); setError(null) }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={
                  tab === key
                    ? { background: '#FFFFFF', color: '#0F172A', boxShadow: '0 1px 3px rgba(15,23,42,0.08)' }
                    : { color: '#94A3B8' }
                }
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: '#94A3B8' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#64748B' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-xl text-sm"
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#EF4444',
              }}
            >
              {error}
            </div>
          )}

          {tab === 'task' ? (
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#64748B' }}>
                  タスク名 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="タスク名を入力"
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.border = '1.5px solid #6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }}
                  onBlur={(e) => { e.currentTarget.style.border = '1.5px solid #E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#64748B' }}>
                  フェーズ
                </label>
                <select
                  value={taskPhaseId}
                  onChange={(e) => setTaskPhaseId(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.border = '1.5px solid #6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }}
                  onBlur={(e) => { e.currentTarget.style.border = '1.5px solid #E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <option value="">なし</option>
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#64748B' }}>
                    開始日
                  </label>
                  <input
                    type="date"
                    value={taskStartDate}
                    onChange={(e) => setTaskStartDate(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.border = '1.5px solid #6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }}
                    onBlur={(e) => { e.currentTarget.style.border = '1.5px solid #E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#64748B' }}>
                    終了日
                  </label>
                  <input
                    type="date"
                    value={taskEndDate}
                    onChange={(e) => setTaskEndDate(e.target.value)}
                    min={taskStartDate}
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.border = '1.5px solid #6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }}
                    onBlur={(e) => { e.currentTarget.style.border = '1.5px solid #E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#64748B' }}>
                  担当者
                </label>
                <select
                  value={taskAssigneeId}
                  onChange={(e) => setTaskAssigneeId(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.border = '1.5px solid #6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }}
                  onBlur={(e) => { e.currentTarget.style.border = '1.5px solid #E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <option value="">未割り当て</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profiles?.display_name ?? m.profiles?.email ?? m.user_id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ border: '1.5px solid #E2E8F0', color: '#64748B', background: 'transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={loading || !taskName.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                    opacity: loading || !taskName.trim() ? 0.6 : 1,
                  }}
                >
                  {loading ? '作成中...' : 'タスクを追加'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAddPhase} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#64748B' }}>
                  フェーズ名 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={phaseName}
                  onChange={(e) => setPhaseName(e.target.value)}
                  placeholder="フェーズ名を入力"
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.border = '1.5px solid #6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }}
                  onBlur={(e) => { e.currentTarget.style.border = '1.5px solid #E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: '#64748B' }}>
                  カラー
                </label>
                <div className="flex gap-2.5">
                  {PHASE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPhaseColor(c)}
                      className="w-8 h-8 rounded-full transition-all"
                      style={{
                        backgroundColor: c,
                        transform: phaseColor === c ? 'scale(1.15)' : 'scale(1)',
                        boxShadow: phaseColor === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#64748B' }}>
                    開始日
                  </label>
                  <input
                    type="date"
                    value={phaseStartDate}
                    onChange={(e) => setPhaseStartDate(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.border = '1.5px solid #6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }}
                    onBlur={(e) => { e.currentTarget.style.border = '1.5px solid #E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#64748B' }}>
                    終了日
                  </label>
                  <input
                    type="date"
                    value={phaseEndDate}
                    onChange={(e) => setPhaseEndDate(e.target.value)}
                    min={phaseStartDate}
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.border = '1.5px solid #6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }}
                    onBlur={(e) => { e.currentTarget.style.border = '1.5px solid #E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ border: '1.5px solid #E2E8F0', color: '#64748B', background: 'transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={loading || !phaseName.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${phaseColor}, ${phaseColor}cc)`,
                    boxShadow: `0 2px 8px ${phaseColor}44`,
                    opacity: loading || !phaseName.trim() ? 0.6 : 1,
                  }}
                >
                  {loading ? '作成中...' : 'フェーズを追加'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
