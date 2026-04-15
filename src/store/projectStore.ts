import { create } from 'zustand'
import type { Project, ProjectMember, Profile } from '@/types'

export type MemberWithProfile = ProjectMember & { profiles: Profile | null }

interface ProjectStore {
  projects: Project[]
  currentProject: Project | null
  members: MemberWithProfile[]
  currentUserRole: string | null
  setProjects: (projects: Project[]) => void
  setCurrentProject: (project: Project | null) => void
  setMembers: (members: MemberWithProfile[]) => void
  setCurrentUserRole: (role: string | null) => void
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  currentProject: null,
  members: [],
  currentUserRole: null,
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setMembers: (members) => set({ members }),
  setCurrentUserRole: (role) => set({ currentUserRole: role }),
}))
