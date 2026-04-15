'use client'

import { useEffect } from 'react'
import { BarChart3, Table2, Settings } from 'lucide-react'
import { useTaskStore } from '@/store/taskStore'
import { useProjectStore } from '@/store/projectStore'
import { useUIStore } from '@/store/uiStore'
import type { Project, Task, Phase, ProjectMember, Profile } from '@/types'
import Link from 'next/link'
import GanttChart from '@/components/gantt/GanttChart'
import TaskSheet from '@/components/sheet/TaskSheet'
import RealtimeProvider from '@/lib/realtime/RealtimeProvider'

interface ProjectViewProps {
  project: Project
  currentUserRole: string | null
  initialTasks: Task[]
  initialPhases: Phase[]
  members: (ProjectMember & { profiles: Profile | null })[]
  currentUserId: string
}

export default function ProjectView({
  project,
  currentUserRole,
  initialTasks,
  initialPhases,
  members,
  currentUserId,
}: ProjectViewProps) {
  const { setTasks, setPhases } = useTaskStore()
  const { setCurrentProject, setCurrentUserRole, setMembers } = useProjectStore()
  const { viewMode, setViewMode, zoomLevel, setZoomLevel } = useUIStore()

  useEffect(() => {
    setTasks(initialTasks)
    setPhases(initialPhases)
    setCurrentProject(project)
    setCurrentUserRole(currentUserRole)
    setMembers(members as Parameters<typeof setMembers>[0])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id])

  return (
    <RealtimeProvider projectId={project.id} currentUserId={currentUserId}>
    <div className="h-full flex flex-col">
      {/* Project header toolbar */}
      <div className="border-b border-gray-200 bg-white px-6 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: project.color }}
          />
          <h2 className="font-semibold text-gray-900 text-sm">{project.name}</h2>
          {currentUserRole && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {currentUserRole === 'owner'
                ? 'オーナー'
                : currentUserRole === 'editor'
                ? '編集者'
                : currentUserRole === 'viewer'
                ? '閲覧者'
                : '制限閲覧'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View mode switcher */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('gantt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'gantt'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Gantt
            </button>
            <button
              onClick={() => setViewMode('sheet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'sheet'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              シート
            </button>
          </div>

          {/* Zoom controls (Gantt only) */}
          {viewMode === 'gantt' && (
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              {(['day', 'week', 'month'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setZoomLevel(level)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    zoomLevel === level
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {level === 'day' ? '日' : level === 'week' ? '週' : '月'}
                </button>
              ))}
            </div>
          )}

          {currentUserRole === 'owner' && (
            <Link
              href={`/projects/${project.id}/settings`}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="設定"
            >
              <Settings className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'gantt' ? (
          <GanttChart />
        ) : (
          <TaskSheet />
        )}
      </div>
    </div>
    </RealtimeProvider>
  )
}
