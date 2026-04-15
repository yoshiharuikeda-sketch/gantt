'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTaskStore } from '@/store/taskStore'
import { useNotificationStore } from '@/store/notificationStore'
import type { Task, Notification } from '@/types'

interface RealtimeProviderProps {
  projectId: string
  currentUserId: string
  children: React.ReactNode
}

export default function RealtimeProvider({
  projectId,
  currentUserId,
  children,
}: RealtimeProviderProps) {
  const { upsertTask, removeTask } = useTaskStore()
  const { addNotification } = useNotificationStore()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null)

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to task changes for this project
    const channel = supabase
      .channel(`project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        (payload: any) => {
          const newTask = payload.new as Task
          // Ignore our own changes (handled optimistically)
          upsertTask(newTask)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        (payload: any) => {
          const updatedTask = payload.new as Task
          upsertTask(updatedTask)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        (payload: any) => {
          const deletedTask = payload.old as { id: string }
          removeTask(deletedTask.id)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload: any) => {
          const notification = payload.new as Notification
          addNotification(notification)
        }
      )
      .subscribe()

    channelRef.current = channel as typeof channelRef.current

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, currentUserId, upsertTask, removeTask, addNotification])

  return <>{children}</>
}
