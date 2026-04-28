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

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  owner:    { label: 'オーナー',  color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
  editor:   { label: '編集者',   color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  viewer:   { label: '閲覧者',   color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  restricted_viewer: { label: '制限閲覧', color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' },
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

  const roleCfg = currentUserRole ? ROLE_LABELS[currentUserRole] : null

  return (
    <RealtimeProvider projectId={project.id} currentUserId={currentUserId}>
      <div className="h-full flex flex-col">
        {/* Project toolbar */}
        <div
          className="px-5 py-2.5 flex items-center justify-between flex-shrink-0"
          style={{
            background: '#FFFFFF',
            borderBottom: '1px solid #EEF2FF',
            boxShadow: '0 1px 3px rgba(15,23,42,0.03)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color, boxShadow: `0 0 0 3px ${project.color}22` }}
            />
            <h2 className="font-semibold text-sm" style={{ color: '#0F172A' }}>
              {project.name}
            </h2>
            {roleCfg && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ color: roleCfg.color, background: roleCfg.bg }}
              >
                {roleCfg.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View mode switcher */}
            <div
              className="flex items-center rounded-lg p-0.5"
              style={{ background: '#F1F5F9' }}
            >
              {[
                { mode: 'gantt' as const, icon: BarChart3, label: 'Gantt' },
                { mode: 'sheet' as const, icon: Table2, label: 'シート' },
              ].map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={
                    viewMode === mode
                      ? {
                          background: '#FFFFFF',
                          color: '#0F172A',
                          boxShadow: '0 1px 3px rgba(15,23,42,0.08)',
                        }
                      : { color: '#94A3B8' }
                  }
                >
                  <Icon style={{ width: 13, height: 13 }} />
                  {label}
                </button>
              ))}
            </div>

            {/* Zoom controls (Gantt only) */}
            {viewMode === 'gantt' && (
              <div
                className="flex items-center rounded-lg p-0.5"
                style={{ background: '#F1F5F9' }}
              >
                {([
                  { level: 'day' as const, label: '日' },
                  { level: 'week' as const, label: '週' },
                  { level: 'month' as const, label: '月' },
                ]).map(({ level, label }) => (
                  <button
                    key={level}
                    onClick={() => setZoomLevel(level)}
                    className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                    style={
                      zoomLevel === level
                        ? {
                            background: '#FFFFFF',
                            color: '#6366F1',
                            boxShadow: '0 1px 3px rgba(15,23,42,0.08)',
                            fontWeight: 600,
                          }
                        : { color: '#94A3B8' }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {currentUserRole === 'owner' && (
              <Link
                href={`/projects/${project.id}/settings`}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: '#94A3B8' }}
                title="設定"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#F1F5F9'
                  ;(e.currentTarget as HTMLElement).style.color = '#6366F1'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = '#94A3B8'
                }}
              >
                <Settings style={{ width: 15, height: 15 }} />
              </Link>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'gantt' ? <GanttChart /> : <TaskSheet />}
        </div>
      </div>
    </RealtimeProvider>
  )
}
