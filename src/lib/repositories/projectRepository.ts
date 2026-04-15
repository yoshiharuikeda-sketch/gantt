import { createClient } from '@/lib/supabase/server'
import type { Project, ProjectMember, Profile } from '@/types'

export type ProjectInsert = {
  name: string
  description?: string | null
  owner_id: string
  color?: string
  start_date?: string | null
  end_date?: string | null
}

export type ProjectUpdate = {
  name?: string
  description?: string | null
  color?: string
  status?: Project['status']
  start_date?: string | null
  end_date?: string | null
}

export async function getProjectsByUser(userId: string): Promise<Project[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*, project_members!inner(user_id)')
    .eq('project_members.user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  // Strip the joined member data — we only needed it for filtering
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return data.map(({ project_members: _pm, ...project }: { project_members: unknown; [key: string]: unknown }) => project as unknown as Project)
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }
  return data
}

export async function createProject(input: ProjectInsert): Promise<Project> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .insert(input)
    .select()
    .single()
  if (error) throw new Error(error.message)

  // Add owner as member
  await supabase.from('project_members').insert({
    project_id: data.id,
    user_id: input.owner_id,
    role: 'owner',
    invited_by: input.owner_id,
  })

  return data
}

export async function updateProject(
  projectId: string,
  update: ProjectUpdate
): Promise<Project> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .update(update)
    .eq('id', projectId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function deleteProject(projectId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('projects').delete().eq('id', projectId)
  if (error) throw new Error(error.message)
}

export async function getProjectMembers(
  projectId: string
): Promise<(ProjectMember & { profiles: Profile | null })[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('project_members')
    .select('*, profiles(*)')
    .eq('project_id', projectId)
  if (error) throw new Error(error.message)
  return data as (ProjectMember & { profiles: Profile | null })[]
}

export async function getMemberRole(
  projectId: string,
  userId: string
): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single()
  return data?.role ?? null
}

export async function updateMemberRole(
  projectId: string,
  userId: string,
  role: ProjectMember['role']
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('project_id', projectId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function removeMember(projectId: string, userId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}
