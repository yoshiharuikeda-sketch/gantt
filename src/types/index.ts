export * from './database'

import type { Profile, Project, ProjectMember, Phase, Task, UpdateRequest } from './database'

export type ProjectWithMembers = Project & {
  project_members: (ProjectMember & { profiles: Profile })[]
}

export type TaskWithDetails = Task & {
  assignee: Profile | null
  phase: Phase | null
}

export type UpdateRequestWithDetails = UpdateRequest & {
  task: Task
  requester: Profile
  assignee: Profile
  approver: Profile
}

export type NotificationData = {
  update_request_id?: string
  task_id?: string
  project_id?: string
  role?: string
}
