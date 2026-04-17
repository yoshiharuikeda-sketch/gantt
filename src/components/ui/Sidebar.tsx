'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderKanban } from 'lucide-react'

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

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
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">Ganttプロ</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* ダッシュボード */}
        <Link
          href="/"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            pathname === '/'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          <LayoutDashboard className="w-4 h-4" />
          ダッシュボード
        </Link>

        {/* プロジェクト一覧 */}
        <div className="pt-3">
          <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            プロジェクト
          </p>

          {loading ? (
            <div className="space-y-1 px-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-7 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400">プロジェクトなし</p>
          ) : (
            <>
              {projects.slice(0, 5).map((p) => {
                const isActive = pathname.startsWith(`/projects/${p.id}`)
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors truncate',
                      isActive
                        ? 'bg-gray-100 text-gray-900 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="truncate">{p.name}</span>
                  </Link>
                )
              })}
              {projects.length > 5 && (
                <Link
                  href="/"
                  className="flex items-center px-3 py-1.5 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                >
                  すべて見る ({projects.length})
                </Link>
              )}
            </>
          )}
        </div>
      </nav>
    </aside>
  )
}
