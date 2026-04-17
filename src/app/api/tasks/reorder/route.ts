import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/tasks/reorder
// body: { project_id: string, task_ids: string[] }
// Sets display_order = index * 10 for each task in the given order
// Auth: user must be owner or editor of the project
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { project_id, task_ids } = body as { project_id: string; task_ids: string[] }

    if (!project_id || !Array.isArray(task_ids)) {
      return NextResponse.json({ error: 'project_id and task_ids are required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify access: user must be owner or editor
    const { data: member } = await admin
      .from('project_members')
      .select('role')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'editor'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update display_order for each task
    const updates = task_ids.map((id, index) =>
      admin
        .from('tasks')
        .update({ display_order: index * 10 })
        .eq('id', id)
        .eq('project_id', project_id)
    )

    await Promise.all(updates)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
