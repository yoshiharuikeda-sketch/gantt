import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import CreateProjectButton from '@/components/dashboard/CreateProjectButton'
import { Calendar, Clock } from 'lucide-react'

const STATUS_CONFIG = {
  active: { label: '進行中', bg: 'rgba(16,185,129,0.1)', color: '#10B981', dot: '#10B981' },
  completed: { label: '完了', bg: 'rgba(99,102,241,0.1)', color: '#6366F1', dot: '#6366F1' },
  archived: { label: 'アーカイブ', bg: 'rgba(148,163,184,0.1)', color: '#94A3B8', dot: '#94A3B8' },
} as const

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: projectsWithRole } = await supabase
    .from('project_members')
    .select(`
      role,
      projects (
        id, name, description, status, color, start_date, end_date, updated_at
      )
    `)
    .eq('user_id', user!.id)
    .order('joined_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projects = (projectsWithRole as any[])
    ?.map((pm) => pm.projects ? { ...pm.projects, role: pm.role } : null)
    .filter(Boolean) ?? []

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: '#0F172A' }}
          >
            プロジェクト
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#94A3B8' }}>
            {projects.length} 件のプロジェクト
          </p>
        </div>
        <CreateProjectButton />
      </div>

      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            if (!project) return null
            const status = project.status as keyof typeof STATUS_CONFIG
            const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.active
            const updatedDate = new Date(project.updated_at).toLocaleDateString('ja-JP', {
              month: 'short',
              day: 'numeric',
            })

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group block rounded-2xl transition-all duration-200"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #EEF2FF',
                  boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.12), 0 2px 8px rgba(15,23,42,0.06)'
                  e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.04)'
                  e.currentTarget.style.borderColor = '#EEF2FF'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {/* Color accent bar */}
                <div
                  className="h-1 rounded-t-2xl"
                  style={{ background: `linear-gradient(90deg, ${project.color ?? '#6366F1'}, ${project.color ?? '#6366F1'}88)` }}
                />

                <div className="p-5">
                  {/* Title row */}
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: `${project.color ?? '#6366F1'}18`,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="3" width="5" height="1.5" rx="0.75" fill={project.color ?? '#6366F1'} fillOpacity="0.9"/>
                        <rect x="2" y="6" width="9" height="1.5" rx="0.75" fill={project.color ?? '#6366F1'} fillOpacity="0.7"/>
                        <rect x="2" y="9" width="7" height="1.5" rx="0.75" fill={project.color ?? '#6366F1'} fillOpacity="0.5"/>
                        <rect x="2" y="12" width="8" height="1.5" rx="0.75" fill={project.color ?? '#6366F1'} fillOpacity="0.35"/>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3
                        className="font-semibold text-sm truncate transition-colors"
                        style={{ color: '#0F172A' }}
                      >
                        {project.name}
                      </h3>
                      {project.description && (
                        <p
                          className="text-xs mt-0.5 line-clamp-2 leading-relaxed"
                          style={{ color: '#94A3B8' }}
                        >
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #F1F5F9' }}>
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: statusCfg.bg, color: statusCfg.color }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: statusCfg.dot }}
                      />
                      {statusCfg.label}
                    </span>
                    <span
                      className="flex items-center gap-1 text-xs"
                      style={{ color: '#CBD5E1' }}
                    >
                      <Clock className="w-3 h-3" />
                      {updatedDate}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div
          className="rounded-2xl p-16 text-center"
          style={{
            background: '#FFFFFF',
            border: '1px dashed #E2E8F0',
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF)' }}
          >
            <Calendar className="w-8 h-8" style={{ color: '#6366F1' }} />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: '#0F172A' }}>
            プロジェクトがありません
          </h3>
          <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: '#94A3B8' }}>
            最初のプロジェクトを作成してガントチャートを始めましょう
          </p>
          <CreateProjectButton variant="primary" />
        </div>
      )}
    </div>
  )
}
