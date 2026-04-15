'use client'

import { useState } from 'react'
import { CheckCircle, X } from 'lucide-react'
import type { UpdateRequest } from '@/types'

interface ResponseFormProps {
  request: UpdateRequest & { tasks?: { name: string; start_date: string | null; end_date: string | null; progress: number; status: string } }
  onClose: () => void
  onSuccess?: () => void
}

const STATUS_OPTIONS = [
  { value: 'not_started', label: '未着手' },
  { value: 'in_progress', label: '進行中' },
  { value: 'completed', label: '完了' },
  { value: 'blocked', label: 'ブロック中' },
]

export default function ResponseForm({ request, onClose, onSuccess }: ResponseFormProps) {
  const task = request.tasks

  const [progress, setProgress] = useState<number>(task?.progress ?? 0)
  const [startDate, setStartDate] = useState(task?.start_date ?? '')
  const [endDate, setEndDate] = useState(task?.end_date ?? '')
  const [status, setStatus] = useState(task?.status ?? 'not_started')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const responseData: Record<string, unknown> = {}
    if (request.request_type === 'progress' || request.request_type === 'general') {
      responseData.progress = progress
      responseData.status = status
    }
    if (request.request_type === 'schedule' || request.request_type === 'general') {
      responseData.start_date = startDate || null
      responseData.end_date = endDate || null
    }
    if (request.request_type === 'status') {
      responseData.status = status
    }
    if (comment.trim()) responseData.comment = comment.trim()

    try {
      const res = await fetch('/api/update-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          action: 'submit',
          response_data: responseData,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '回答の送信に失敗しました')
      }

      onSuccess?.()
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const showProgress = ['progress', 'general'].includes(request.request_type)
  const showSchedule = ['schedule', 'general'].includes(request.request_type)
  const showStatus = ['status', 'progress', 'general'].includes(request.request_type)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">更新回答</h3>
            {task && <p className="text-xs text-gray-500 mt-0.5">{task.name}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {request.message && (
          <div className="mx-5 mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 border border-blue-100">
            <p className="font-medium mb-1">依頼者からのメッセージ</p>
            <p>{request.message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {showProgress && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                進捗 ({progress}%)
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {showStatus && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ステータス</label>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatus(s.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      status === s.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showSchedule && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">開始日</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">終了日</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              コメント（任意）
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="依頼者へのコメントを入力"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {loading ? '送信中...' : '回答を送信'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
