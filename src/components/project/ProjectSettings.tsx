'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, Trash2, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import type { Project, ProjectMember, Profile } from '@/types'

type MemberWithProfile = ProjectMember & { profiles: Profile | null }

const ROLE_LABELS: Record<string, string> = {
  owner: 'オーナー',
  editor: '編集者',
  viewer: '閲覧者',
  limited_viewer: '制限閲覧',
}

const INVITE_ROLES = ['editor', 'viewer', 'limited_viewer'] as const

interface ProjectSettingsProps {
  project: Project
  members: MemberWithProfile[]
  currentUserId: string
}

export default function ProjectSettings({
  project,
  members: initialMembers,
  currentUserId,
}: ProjectSettingsProps) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)

  // Project info form
  const [projectName, setProjectName] = useState(project.name)
  const [projectDesc, setProjectDesc] = useState(project.description ?? '')
  const [projectColor, setProjectColor] = useState(project.color)
  const [savingProject, setSavingProject] = useState(false)
  const [projectError, setProjectError] = useState<string | null>(null)

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<typeof INVITE_ROLES[number]>('editor')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProject(true)
    setProjectError(null)

    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: project.id,
          name: projectName,
          description: projectDesc || null,
          color: projectColor,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '保存に失敗しました')
      }

      router.refresh()
    } catch (e) {
      setProjectError((e as Error).message)
    } finally {
      setSavingProject(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteError(null)
    setInviteSuccess(null)

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? '招待に失敗しました')
      }

      const result = await res.json()
      setInviteSuccess(result.message ?? `${inviteEmail} を招待しました`)
      setInviteEmail('')

      // Refresh members list
      const membersRes = await fetch(`/api/members?projectId=${project.id}`)
      if (membersRes.ok) {
        setMembers(await membersRes.json())
      }
    } catch (e) {
      setInviteError((e as Error).message)
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          user_id: userId,
          role: newRole,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? { ...m, role: newRole as ProjectMember['role'] } : m))
      )
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('このメンバーをプロジェクトから削除しますか？')) return

    try {
      const res = await fetch(
        `/api/members?projectId=${project.id}&userId=${userId}`,
        { method: 'DELETE' }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setMembers((prev) => prev.filter((m) => m.user_id !== userId))
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const PROJECT_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
  ]

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {/* Back link */}
        <Link
          href={`/projects/${project.id}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          プロジェクトに戻る
        </Link>

        <h1 className="text-xl font-semibold text-gray-900">プロジェクト設定</h1>

        {/* Project info */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">基本情報</h2>
          <form onSubmit={handleSaveProject} className="space-y-4">
            {projectError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{projectError}</p>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">プロジェクト名</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">説明</label>
              <textarea
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">カラー</label>
              <div className="flex gap-2 flex-wrap">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setProjectColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${
                      projectColor === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingProject}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {savingProject ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </section>

        {/* Members */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">メンバー管理</h2>

          {/* Invite form */}
          <form onSubmit={handleInvite} className="flex gap-2 mb-4">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="メールアドレスで招待"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as typeof INVITE_ROLES[number])}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {INVITE_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              招待
            </button>
          </form>

          {inviteError && (
            <p className="mb-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{inviteError}</p>
          )}
          {inviteSuccess && (
            <p className="mb-3 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{inviteSuccess}</p>
          )}

          {/* Member list */}
          <div className="divide-y divide-gray-100">
            {members.map((m) => {
              const name = m.profiles?.display_name ?? m.profiles?.email ?? m.user_id
              const isCurrentUser = m.user_id === currentUserId
              const isOwner = m.role === 'owner'

              return (
                <div key={m.user_id} className="flex items-center gap-3 py-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700 flex-shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {name}
                      {isCurrentUser && (
                        <span className="ml-1 text-xs text-gray-400">(あなた)</span>
                      )}
                    </p>
                    {m.profiles?.email && (
                      <p className="text-xs text-gray-400 truncate">{m.profiles.email}</p>
                    )}
                  </div>

                  {isOwner ? (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      オーナー
                    </span>
                  ) : (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {INVITE_ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  )}

                  {!isOwner && (
                    <button
                      onClick={() => handleRemoveMember(m.user_id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="メンバーを削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
