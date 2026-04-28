'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, LogOut, CheckCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresInsertPayload, User as SupabaseUser } from '@supabase/supabase-js'
import type { Profile, UpdateRequest, Notification } from '@/types'
import { useNotificationStore } from '@/store/notificationStore'
import { formatDateTime } from '@/lib/utils/dateUtils'
import ResponseForm from '@/components/update-request/ResponseForm'
import ApprovalPanel from '@/components/update-request/ApprovalPanel'

type RequestWithTask = UpdateRequest & {
  tasks?: { name: string; start_date: string | null; end_date: string | null; progress: number; status: string }
}

interface HeaderProps {
  profile: Profile | null
}

function getInitials(name: string): string {
  return name
    .split(/[\s_@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join('')
}

export default function Header({ profile }: HeaderProps) {
  const router = useRouter()
  const { notifications, unreadCount, setNotifications, markAsRead, addNotification } = useNotificationStore()
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const [activeRequest, setActiveRequest] = useState<RequestWithTask | null>(null)
  const [modalType, setModalType] = useState<'response' | 'approval' | null>(null)

  useEffect(() => {
    fetch('/api/notifications?limit=20')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setNotifications(data) })
      .catch(() => {})
  }, [setNotifications])

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    supabase.auth.getUser().then(({ data: { user } }: { data: { user: SupabaseUser | null } }) => {
      if (!user) return
      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload: RealtimePostgresInsertPayload<Notification>) => {
            addNotification(payload.new as Notification)
          }
        )
        .subscribe()
    })

    return () => {
      if (channel) {
        const supabase = createClient()
        supabase.removeChannel(channel)
      }
    }
  }, [addNotification])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleMarkAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
    notifications.forEach((n) => { if (!n.is_read) markAsRead(n.id) })
  }

  const handleMarkRead = async (id: string) => {
    markAsRead(id)
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  const handleNotificationClick = async (n: { id: string; type: string; is_read: boolean; data?: unknown }) => {
    if (!n.is_read) handleMarkRead(n.id)
    setBellOpen(false)

    const data = n.data as { update_request_id?: string } | null
    if (!data?.update_request_id) return

    if (n.type === 'update_request' || n.type === 'update_submitted') {
      try {
        const res = await fetch(`/api/update-requests/detail?id=${data.update_request_id}`)
        if (!res.ok) return
        const req: RequestWithTask = await res.json()
        setActiveRequest(req)
        setModalType(n.type === 'update_request' ? 'response' : 'approval')
      } catch { /* ignore */ }
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayName = profile?.display_name ?? profile?.email ?? 'ユーザー'
  const initials = getInitials(displayName)

  return (
    <>
      <header
        className="h-14 flex items-center justify-between px-6 flex-shrink-0"
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #EEF2FF',
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
        }}
      >
        <div />

        <div className="flex items-center gap-1">
          {/* Notification bell */}
          <div ref={bellRef} className="relative">
            <button
              onClick={() => setBellOpen((v) => !v)}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: '#64748B' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F1F5F9'
                e.currentTarget.style.color = '#0F172A'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#64748B'
              }}
            >
              <Bell className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
              {unreadCount > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-white text-xs font-semibold rounded-full"
                  style={{
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    fontSize: '10px',
                    lineHeight: 1,
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {bellOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-80 rounded-xl overflow-hidden animate-fade-in"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 24px rgba(15,23,42,0.12), 0 1px 4px rgba(15,23,42,0.06)',
                  zIndex: 50,
                }}
              >
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: '1px solid #F1F5F9' }}
                >
                  <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>通知</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-xs font-medium transition-colors"
                      style={{ color: '#6366F1' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#4F46E5' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#6366F1' }}
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      全て既読
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
                        style={{ background: '#F1F5F9' }}
                      >
                        <Bell className="w-5 h-5" style={{ color: '#94A3B8' }} />
                      </div>
                      <p className="text-sm" style={{ color: '#94A3B8' }}>通知はありません</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className="w-full text-left px-4 py-3 transition-colors"
                        style={{
                          borderBottom: '1px solid #F8FAFC',
                          background: !n.is_read ? '#FAFBFF' : 'transparent',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = !n.is_read ? '#FAFBFF' : 'transparent' }}
                      >
                        <div className="flex items-start gap-2.5">
                          {!n.is_read && (
                            <div
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                              style={{ background: '#6366F1' }}
                            />
                          )}
                          <div className={!n.is_read ? '' : 'pl-4'}>
                            <p className="text-xs font-semibold" style={{ color: '#0F172A' }}>{n.title}</p>
                            {n.body && (
                              <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#64748B' }}>{n.body}</p>
                            )}
                            <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
                              {formatDateTime(n.created_at)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-6 mx-2" style={{ background: '#E2E8F0' }} />

          {/* User section */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold overflow-hidden flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
            >
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="w-8 h-8 object-cover" />
              ) : (
                initials
              )}
            </div>
            <span
              className="text-sm font-medium hidden sm:block max-w-[120px] truncate"
              style={{ color: '#334155' }}
            >
              {displayName}
            </span>
            <button
              onClick={handleSignOut}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: '#94A3B8' }}
              title="ログアウト"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FEF2F2'
                e.currentTarget.style.color = '#EF4444'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#94A3B8'
              }}
            >
              <LogOut style={{ width: 15, height: 15 }} />
            </button>
          </div>
        </div>
      </header>

      {modalType === 'response' && activeRequest && (
        <ResponseForm
          request={activeRequest}
          onClose={() => { setActiveRequest(null); setModalType(null) }}
          onSuccess={() => { setActiveRequest(null); setModalType(null) }}
        />
      )}
      {modalType === 'approval' && activeRequest && (
        <ApprovalPanel
          request={activeRequest}
          onClose={() => { setActiveRequest(null); setModalType(null) }}
          onSuccess={() => { setActiveRequest(null); setModalType(null) }}
        />
      )}
    </>
  )
}
