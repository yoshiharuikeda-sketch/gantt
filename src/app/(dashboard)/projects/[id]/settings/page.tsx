import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import ProjectSettings from '@/components/project/ProjectSettings'

interface SettingsPageProps {
  params: Promise<{ id: string }>
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
    .eq('user_id', user.id)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const member = memberRaw as { role: string } | null

  if (member?.role !== 'owner') redirect(`/projects/${id}`)

  const { data: members } = await supabase
    .from('project_members')
    .select('*, profiles(*)')
    .eq('project_id', id)

  return (
    <ProjectSettings
      project={project}
      members={members ?? []}
      currentUserId={user.id}
    />
  )
}
