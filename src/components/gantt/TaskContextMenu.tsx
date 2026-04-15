'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Pencil, Trash2 } from 'lucide-react'
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
  const { currentUserRole, currentProject } = useProjectStore()
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
    if (res.ok) {
      removeTask(task.id)
    }
  }

  // Adjust position to stay in viewport
  const adjustedX = Math.min(x, window.innerWidth - 200)
  const adjustedY = Math.min(y, window.innerHeight - 150)

  return (
    <>
      <div
        ref={menuRef}
        className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-48"
        style={{ left: adjustedX, top: adjustedY }}
      >
        {canRequest && (
          <button
            onClick={() => setShowRequestModal(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <Send className="w-4 h-4" />
            更新依頼
          </button>
        )}
        {canEdit && (
          <>
            {canRequest && <div className="mx-3 my-1 border-t border-gray-100" />}
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              削除
            </button>
          </>
        )}
        {!canEdit && !canRequest && (
          <div className="px-3 py-2 text-xs text-gray-400">操作できません</div>
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
