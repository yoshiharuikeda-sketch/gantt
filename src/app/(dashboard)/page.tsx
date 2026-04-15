import { createClient } from '@/lib/supabase/server'
import { FolderKanban } from 'lucide-react'
import Link from 'next/link'
import CreateProjectButton from '@/components/dashboard/CreateProjectButton'

const STATUS_LABELS = {
  active: '進行中',
  completed: '完了',
  archived: 'アーカイブ',
} as const

const STATUS_COLORS = {
  active: 'text-green-600 bg-green-50',
  completed: 'text-blue-600 bg-blue-50',
  archived: 'text-gray-500 bg-gray-100',
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
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">プロジェクト</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {projects.length} 件のプロジェクト
          </p>
        </div>
        <CreateProjectButton />
      </div>

      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            if (!project) return null
            const status = project.status as keyof typeof STATUS_LABELS
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all hover:border-gray-300 group"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: (project.color ?? '#3B82F6') + '20',
                      color: project.color ?? '#3B82F6',
                    }}
                  >
                    <FolderKanban className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[status] ?? 'text-gray-500 bg-gray-100'}`}
                  >
                    {STATUS_LABELS[status] ?? status}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(project.updated_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-24">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            プロジェクトがありません
          </h3>
          <p className="text-gray-500 mb-6 text-sm">
            最初のプロジェクトを作成してGanttチャートを始めましょう。
          </p>
          <CreateProjectButton variant="primary" />
        </div>
      )}
    </div>
  )
}
