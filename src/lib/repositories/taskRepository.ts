import { createClient } from '@/lib/supabase/server'
import type { Task, Phase } from '@/types'

export type TaskInsert = {
  project_id: string
  phase_id?: string | null
  name: string
  description?: string | null
  assignee_id?: string | null
  start_date?: string | null
  end_date?: string | null
  progress?: number
  status?: Task['status']
  display_order?: number
  parent_task_id?: string | null
}

export type TaskUpdate = Partial<Omit<TaskInsert, 'project_id'>> & {
  version?: number
}

export type PhaseInsert = {
  project_id: string
  name: string
  color?: string
  display_order?: number
  start_date?: string | null
  end_date?: string | null
}

export type PhaseUpdate = Partial<Omit<PhaseInsert, 'project_id'>>

// Tasks

export async function getTasksByProject(projectId: string): Promise<Task[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('display_order', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

export async function createTask(input: TaskInsert): Promise<Task> {
  const supabase = await createClient()

  // Get next display_order
  const { data: existing } = await supabase
    .from('tasks')
    .select('display_order')
    .eq('project_id', input.project_id)
    .order('display_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = existing ? existing.display_order + 1 : 0

  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...input, display_order: input.display_order ?? nextOrder })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updateTask(
  taskId: string,
  update: TaskUpdate,
  currentVersion?: number
): Promise<Task> {
  const supabase = await createClient()

  let query = supabase
    .from('tasks')
    .update({ ...update, version: (currentVersion ?? 0) + 1 })
    .eq('id', taskId)

  if (currentVersion !== undefined) {
    query = query.eq('version', currentVersion)
  }

  const { data, error } = await query.select().single()
  if (error) throw new Error(error.message)
  if (!data) throw new Error('バージョン競合が発生しました。ページを更新してください。')
  return data
}

export async function deleteTask(taskId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) throw new Error(error.message)
}

export async function reorderTasks(
  projectId: string,
  orderedIds: string[]
): Promise<void> {
  const supabase = await createClient()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('tasks')
        .update({ display_order: index })
        .eq('id', id)
        .eq('project_id', projectId)
    )
  )
}

// Phases

export async function getPhasesByProject(projectId: string): Promise<Phase[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('phases')
    .select('*')
    .eq('project_id', projectId)
    .order('display_order', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

export async function createPhase(input: PhaseInsert): Promise<Phase> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('phases')
    .select('display_order')
    .eq('project_id', input.project_id)
    .order('display_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = existing ? existing.display_order + 1 : 0

  const { data, error } = await supabase
    .from('phases')
    .insert({ ...input, display_order: input.display_order ?? nextOrder })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function updatePhase(phaseId: string, update: PhaseUpdate): Promise<Phase> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('phases')
    .update(update)
    .eq('id', phaseId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deletePhase(phaseId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('phases').delete().eq('id', phaseId)
  if (error) throw new Error(error.message)
}
