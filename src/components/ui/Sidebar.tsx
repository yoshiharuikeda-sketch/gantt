'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ChevronRight } from 'lucide-react'

type Project = { id: string; name: string; color: string }

export default function Sidebar() {
  const pathname = usePathname()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setProjects(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <aside className="w-56 flex flex-col flex-shrink-0" style={{ background: 'var(--sidebar-bg)' }}>
      {/* Logo */}
      <div className="px-4 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" className="flex items-center gap-2.5 group">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="4" width="5" height="2" rx="1" fill="white" fillOpacity="0.9"/>
              <rect x="2" y="7.5" width="9" height="2" rx="1" fill="white" fillOpacity="0.7"/>
              <rect x="2" y="11" width="7" height="2" rx="1" fill="white" fillOpacity="0.5"/>
            </svg>
          </div>
          <div>
            <span className="text-white font-semibold text-sm tracking-tight">Ganttプロ</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto sidebar-scroll">
        {/* Dashboard */}
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
          style={
            pathname === '/'
              ? {
                  background: 'rgba(99,102,241,0.2)',
                  color: '#A5B4FC',
                }
              : {
                  color: 'rgba(255,255,255,0.55)',
                }
          }
          onMouseEnter={(e) => {
            if (pathname !== '/') {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.85)'
            }
          }}
          onMouseLeave={(e) => {
            if (pathname !== '/') {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
            }
          }}
        >
          <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
          <span>ダッシュボード</span>
        </Link>

        {/* Projects section */}
        <div className="pt-4 pb-1">
          <p
            className="px-3 mb-1.5 text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            プロジェクト
          </p>

          {loading ? (
            <div className="space-y-1 px-3 pt-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-7 rounded-lg skeleton" style={{ background: 'rgba(255,255,255,0.06)' }} />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <p className="px-3 py-2 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              プロジェクトなし
            </p>
          ) : (
            <>
              {projects.slice(0, 8).map((p) => {
                const isActive = pathname.startsWith(`/projects/${p.id}`)
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all"
                    style={
                      isActive
                        ? {
                            background: 'rgba(99,102,241,0.15)',
                            color: 'rgba(255,255,255,0.9)',
                          }
                        : {
                            color: 'rgba(255,255,255,0.5)',
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                        e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
                      }
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="truncate flex-1 text-xs font-medium">{p.name}</span>
                    {isActive && (
                      <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-60" />
                    )}
                  </Link>
                )
              })}
              {projects.length > 8 && (
                <Link
                  href="/"
                  className="flex items-center px-3 py-1.5 text-xs transition-all"
                  style={{ color: 'rgba(99,102,241,0.7)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#A5B4FC' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(99,102,241,0.7)' }}
                >
                  すべて表示 ({projects.length})
                </Link>
              )}
            </>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div
          className="text-xs px-2 py-1.5 rounded-lg"
          style={{ color: 'rgba(255,255,255,0.2)' }}
        >
          Ganttプロ v1.0
        </div>
      </div>
    </aside>
  )
}
