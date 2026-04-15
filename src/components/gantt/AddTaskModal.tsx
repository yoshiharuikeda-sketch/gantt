'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { useTaskStore } from '@/store/taskStore'
import { useProjectStore } from '@/store/projectStore'
import type { Task, Phase } from '@/types'

interface AddTaskModalProps {
  onClose: () => void
}

const PHASE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
]

export default function AddTaskModal({ onClose }: AddTaskModalProps) {
  const { tasks, phases, upsertTask, setPhases } = useTaskStore()
  const { currentProject } = useProjectStore()

  const [tab, setTab] = useState<'task' | 'phase'>('task')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Task form
  const [taskName, setTaskName] = useState('')
  const [taskPhaseId, setTaskPhaseId] = useState<string>('')
  const [taskStartDate, setTaskStartDate] = useState('')
  const [taskEndDate, setTaskEndDate] = useState('')
  const [taskAssigneeId, setTaskAssigneeId] = useState<string>('')

  // Phase form
  const [phaseName, setPhaseName] = useState('')
  const [phaseColor, setPhaseColor] = useState(PHASE_COLORS[0])
  const [phaseStartDate, setPhaseStartDate] = useState('')
  const [phaseEndDate, setPhaseEndDate] = useState('')

  const { members } = useProjectStore()

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
      setPhases([...phases, phase])
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setTab('task')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                tab === 'task' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              タスク追加
            </button>
            <button
              onClick={() => setTab('phase')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                tab === 'phase' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              フェーズ追加
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {error && (
            <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {tab === 'task' ? (
            <form onSubmit={handleAddTask} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  タスク名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="タスク名を入力"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">フェーズ</label>
                <select
                  value={taskPhaseId}
                  onChange={(e) => setTaskPhaseId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">なし</option>
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">開始日</label>
                  <input
                    type="date"
                    value={taskStartDate}
                    onChange={(e) => setTaskStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">終了日</label>
                  <input
                    type="date"
                    value={taskEndDate}
                    onChange={(e) => setTaskEndDate(e.target.value)}
                    min={taskStartDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">担当者</label>
                <select
                  value={taskAssigneeId}
                  onChange={(e) => setTaskAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">未割り当て</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profiles?.display_name ?? m.profiles?.email ?? m.user_id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={loading || !taskName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {loading ? '作成中...' : 'タスク追加'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAddPhase} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  フェーズ名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={phaseName}
                  onChange={(e) => setPhaseName(e.target.value)}
                  placeholder="フェーズ名を入力"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">カラー</label>
                <div className="flex gap-2 flex-wrap">
                  {PHASE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPhaseColor(c)}
                      className={`w-7 h-7 rounded-full transition-all ${
                        phaseColor === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">開始日</label>
                  <input
                    type="date"
                    value={phaseStartDate}
                    onChange={(e) => setPhaseStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">終了日</label>
                  <input
                    type="date"
                    value={phaseEndDate}
                    onChange={(e) => setPhaseEndDate(e.target.value)}
                    min={phaseStartDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={loading || !phaseName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {loading ? '作成中...' : 'フェーズ追加'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
