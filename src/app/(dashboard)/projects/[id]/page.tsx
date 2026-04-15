import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProjectView from '@/components/project/ProjectView'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: memberRaw } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', id)
    .eq('user_id', user!.id)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const member = memberRaw as { role: string } | null

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', id)
    .order('display_order', { ascending: true })

  const { data: phases } = await supabase
    .from('phases')
    .select('*')
    .eq('project_id', id)
    .order('display_order', { ascending: true })

  const { data: members } = await supabase
    .from('project_members')
    .select('*, profiles(*)')
    .eq('project_id', id)

  return (
    <ProjectView
      project={project}
      currentUserRole={member?.role ?? null}
      initialTasks={tasks ?? []}
      initialPhases={phases ?? []}
      members={members ?? []}
      currentUserId={user!.id}
    />
  )
}
