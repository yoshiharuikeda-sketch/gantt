'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

const COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#3B82F6', '#EF4444', '#14B8A6',
]

interface CreateProjectButtonProps {
  variant?: 'default' | 'primary'
}

export default function CreateProjectButton({ variant = 'default' }: CreateProjectButtonProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, color }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? '作成に失敗しました')
        setLoading(false)
        return
      }

      setOpen(false)
      setName('')
      setDescription('')
      router.push(`/projects/${data.id}`)
      router.refresh()
    } catch {
      setError('ネットワークエラーが発生しました')
    }

    setLoading(false)
  }

  const triggerStyle = variant === 'primary'
    ? {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: 600,
        color: '#FFFFFF',
        background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
        boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
        border: 'none',
        cursor: 'pointer',
      }
    : {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: 600,
        color: '#FFFFFF',
        background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
        boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
        border: 'none',
        cursor: 'pointer',
      }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={triggerStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(99,102,241,0.45)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = variant === 'primary' ? '0 4px 12px rgba(99,102,241,0.35)' : '0 2px 8px rgba(99,102,241,0.3)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        <Plus style={{ width: 15, height: 15 }} />
        新規プロジェクト
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            className="w-full max-w-md rounded-2xl animate-slide-up"
            style={{
              background: '#FFFFFF',
              boxShadow: '0 24px 64px rgba(15,23,42,0.2), 0 4px 16px rgba(15,23,42,0.1)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid #F1F5F9' }}
            >
              <div>
                <h2 className="text-base font-semibold" style={{ color: '#0F172A' }}>
                  新規プロジェクト
                </h2>
                <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                  プロジェクトの基本情報を入力してください
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: '#94A3B8' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#64748B' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              {error && (
                <div
                  className="px-4 py-3 rounded-xl text-sm"
                  style={{
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#EF4444',
                  }}
                >
                  {error}
                </div>
              )}

              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                  style={{ color: '#64748B' }}
                >
                  プロジェクト名 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{
                    border: '1.5px solid #E2E8F0',
                    color: '#0F172A',
                    background: '#FAFBFF',
                  }}
                  onFocus={(e) => { e.currentTarget.style.border = '1.5px solid #6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }}
                  onBlur={(e) => { e.currentTarget.style.border = '1.5px solid #E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
                  placeholder="例: Webサイトリニューアル"
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                  style={{ color: '#64748B' }}
                >
                  説明 <span style={{ color: '#CBD5E1' }}>(任意)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all resize-none"
                  style={{
                    border: '1.5px solid #E2E8F0',
                    color: '#0F172A',
                    background: '#FAFBFF',
                  }}
                  onFocus={(e) => { e.currentTarget.style.border = '1.5px solid #6366F1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }}
                  onBlur={(e) => { e.currentTarget.style.border = '1.5px solid #E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
                  placeholder="プロジェクトの概要を入力"
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold mb-2.5 uppercase tracking-wide"
                  style={{ color: '#64748B' }}
                >
                  アクセントカラー
                </label>
                <div className="flex gap-2.5">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-8 h-8 rounded-full transition-all"
                      style={{
                        backgroundColor: c,
                        transform: color === c ? 'scale(1.15)' : 'scale(1)',
                        boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    border: '1.5px solid #E2E8F0',
                    color: '#64748B',
                    background: 'transparent',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                    opacity: loading || !name.trim() ? 0.6 : 1,
                  }}
                >
                  {loading ? '作成中...' : '作成する'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
