'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { User, Mail, Lock, CheckCircle, ArrowRight } from 'lucide-react'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px 10px 40px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.1)',
    fontSize: '14px',
    color: '#FFFFFF',
    background: 'rgba(255,255,255,0.06)',
    outline: 'none',
  }

  if (success) {
    return (
      <div
        className="rounded-2xl p-10 text-center animate-slide-up"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
        >
          <CheckCircle className="w-8 h-8" style={{ color: '#10B981' }} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">確認メールを送信しました</h2>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
          メールのリンクをクリックして登録を完了してください
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium"
          style={{ color: '#A5B4FC' }}
        >
          ログインページへ
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl p-8 animate-slide-up"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      {/* Brand */}
      <div className="text-center mb-8">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="6" width="8" height="3" rx="1.5" fill="white" fillOpacity="0.95"/>
            <rect x="3" y="11" width="14" height="3" rx="1.5" fill="white" fillOpacity="0.75"/>
            <rect x="3" y="16" width="11" height="3" rx="1.5" fill="white" fillOpacity="0.55"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">アカウント作成</h1>
        <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Ganttプロへようこそ
        </p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        {error && (
          <div
            className="px-4 py-3 rounded-xl text-sm"
            style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#FCA5A5',
            }}
          >
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            表示名
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              style={inputStyle}
              placeholder="山田 太郎"
              onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(99,102,241,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)' }}
              onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            メールアドレス
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
              placeholder="example@email.com"
              onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(99,102,241,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)' }}
              onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
            パスワード（8文字以上）
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              style={inputStyle}
              placeholder="••••••••"
              onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(99,102,241,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)' }}
              onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none' }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all mt-2"
          style={{
            background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(99,102,241,0.4)',
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.5)' }}
          onMouseLeave={(e) => { if (!loading) e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.4)' }}
        >
          {loading ? '登録中...' : (
            <>
              アカウントを作成
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
        すでにアカウントをお持ちの方は{' '}
        <Link
          href="/login"
          className="font-medium"
          style={{ color: '#A5B4FC' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#C7D2FE' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#A5B4FC' }}
        >
          ログイン
        </Link>
      </p>
    </div>
  )
}
