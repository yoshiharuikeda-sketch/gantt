'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Trash2 } from 'lucide-react'
import type { Task } from '@/types'
import { useTaskStore } from '@/store/taskStore'
import { useProjectStore } from '@/store/projectStore'
import RequestModal from '@/components/update-request/RequestModal'

interface TaskContextMenuProps {
  task: Task
  x: number
  y: number
  onClose: () => void
}

export default function TaskContextMenu({ task, x, y, onClose }: TaskContextMenuProps) {
  const { removeTask } = useTaskStore()
  const { currentUserRole } = useProjectStore()
  const menuRef = useRef<HTMLDivElement>(null)
  const [showRequestModal, setShowRequestModal] = useState(false)

  const canEdit = currentUserRole === 'owner' || currentUserRole === 'editor'
  const canRequest = canEdit && task.assignee_id

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleDelete = async () => {
    if (!confirm(`「${task.name}」を削除しますか？`)) return
    onClose()
    const res = await fetch(`/api/tasks?id=${task.id}`, { method: 'DELETE' })
    if (res.ok) removeTask(task.id)
  }

  const adjustedX = Math.min(x, window.innerWidth - 200)
  const adjustedY = Math.min(y, window.innerHeight - 150)

  return (
    <>
      <div
        ref={menuRef}
        className="fixed z-50 rounded-xl py-1.5 w-48 animate-fade-in"
        style={{
          left: adjustedX,
          top: adjustedY,
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 8px 24px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)',
        }}
      >
        {/* Task name header */}
        <div className="px-3 py-2 mb-1" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <p className="text-xs font-semibold truncate" style={{ color: '#0F172A' }}>{task.name}</p>
        </div>

        {canRequest && (
          <button
            onClick={() => setShowRequestModal(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors"
            style={{ color: '#6366F1' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#EEF2FF' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            <Send className="w-3.5 h-3.5" />
            更新依頼を送る
          </button>
        )}

        {canEdit && (
          <>
            {canRequest && (
              <div style={{ margin: '4px 12px', height: 1, background: '#F1F5F9' }} />
            )}
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors"
              style={{ color: '#EF4444' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.05)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              削除
            </button>
          </>
        )}

        {!canEdit && !canRequest && (
          <div className="px-3 py-2 text-xs" style={{ color: '#94A3B8' }}>操作できません</div>
        )}
      </div>

      {showRequestModal && (
        <RequestModal
          task={task}
          onClose={() => {
            setShowRequestModal(false)
            onClose()
          }}
        />
      )}
    </>
  )
}
