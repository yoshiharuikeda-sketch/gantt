'use client'

import { useState } from 'react'
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { UpdateRequest, Task } from '@/types'
import { useTaskStore } from '@/store/taskStore'

type RequestWithTask = UpdateRequest & {
  tasks?: {
    name: string
    start_date: string | null
    end_date: string | null
    progress: number
    status: string
  }
}

interface ApprovalPanelProps {
  request: RequestWithTask
  onClose: () => void
  onSuccess?: () => void
}

const STATUS_LABELS: Record<string, string> = {
  not_started: '未着手',
  in_progress: '進行中',
  completed: '完了',
  blocked: 'ブロック中',
}

export default function ApprovalPanel({ request, onClose, onSuccess }: ApprovalPanelProps) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { upsertTask } = useTaskStore()

  const task = request.tasks
  const responseData = request.response_data as Record<string, unknown> | null

  const handleDecision = async (action: 'approve' | 'reject') => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/update-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          action,
          rejection_reason: action === 'reject' ? rejectionReason.trim() || null : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '処理に失敗しました')
      }

      const data = await res.json()

      // 承認時：APIが返したupdatedTaskでストアを即時更新
      if (action === 'approve' && data.updatedTask) {
        upsertTask(data.updatedTask as Task)
      }

      onSuccess?.()
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const renderDiff = (field: string, label: string, current: unknown, proposed: unknown) => {
    if (proposed === undefined || proposed === null) return null
    const changed = String(current) !== String(proposed)
    return (
      <div className={`flex items-center gap-2 py-1.5 text-xs ${changed ? 'text-gray-900' : 'text-gray-400'}`}>
        <span className="w-20 text-gray-500 flex-shrink-0">{label}</span>
        {changed ? (
          <>
            <span className="line-through text-red-400">{String(current ?? '-')}</span>
            <span className="text-gray-400">→</span>
            <span className="font-medium text-green-700">{String(proposed)}</span>
          </>
        ) : (
          <span>{String(current ?? '-')}</span>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">更新承認</h3>
            {task && <p className="text-xs text-gray-500 mt-0.5">{task.name}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Request info */}
          {request.message && (
            <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-200">
              <p className="font-medium text-gray-700 mb-1">依頼メッセージ</p>
              <p>{request.message}</p>
            </div>
          )}

          {/* Diff view */}
          {responseData && task && (
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-700 mb-2">変更内容プレビュー</p>
              <div className="space-y-0.5">
                {renderDiff('progress', '進捗', `${task.progress}%`, responseData.progress !== undefined ? `${responseData.progress}%` : undefined)}
                {renderDiff('status', 'ステータス',
                  STATUS_LABELS[task.status] ?? task.status,
                  responseData.status ? STATUS_LABELS[responseData.status as string] ?? responseData.status : undefined
                )}
                {renderDiff('start_date', '開始日', task.start_date, responseData.start_date)}
                {renderDiff('end_date', '終了日', task.end_date, responseData.end_date)}
              </div>
              {responseData.comment != null && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">担当者コメント: {String(responseData.comment)}</p>
                </div>
              )}
            </div>
          )}

          {/* Reject form */}
          {showRejectForm && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">却下理由</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="却下理由を入力（任意）"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              閉じる
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setShowRejectForm((v) => !v)}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              {showRejectForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              却下
            </button>
            {showRejectForm && (
              <button
                onClick={() => handleDecision('reject')}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                {loading ? '処理中...' : '却下確定'}
              </button>
            )}
            <button
              onClick={() => handleDecision('approve')}
              disabled={loading || showRejectForm}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {loading ? '処理中...' : '承認'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
