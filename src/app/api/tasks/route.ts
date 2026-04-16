import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTasksByProject } from '@/lib/repositories/taskRepository'

// GET /api/tasks?projectId=xxx
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const tasks = await getTasksByProject(projectId)
    return NextResponse.json(tasks)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// POST /api/tasks
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { project_id, name, phase_id, start_date, end_date, assignee_id, description } = body

    if (!project_id || !name) {
      return NextResponse.json({ error: 'project_id and name are required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify access
    const { data: member } = await admin
      .from('project_members')
      .select('role')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'editor'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get next display_order
    const { data: existing } = await admin
      .from('tasks')
      .select('display_order')
      .eq('project_id', project_id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = existing ? existing.display_order + 1 : 0

    const { data: task, error: taskError } = await admin
      .from('tasks')
      .insert({
        project_id,
        name,
        phase_id: phase_id ?? null,
        start_date: start_date ?? null,
        end_date: end_date ?? null,
        assignee_id: assignee_id ?? null,
        description: description ?? null,
        display_order: nextOrder,
      })
      .select()
      .single()

    if (taskError) throw new Error(taskError.message)

    return NextResponse.json(task, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// PATCH /api/tasks
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, version, ...update } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Check task exists and user has access
    const { data: task } = await admin
      .from('tasks')
      .select('project_id')
      .eq('id', id)
      .single()

    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const { data: member } = await admin
      .from('project_members')
      .select('role')
      .eq('project_id', task.project_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'editor'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let query = admin
      .from('tasks')
      .update({ ...update, version: (version ?? 0) + 1 })
      .eq('id', id)

    if (version !== undefined) {
      query = query.eq('version', version)
    }

    const { data: updated, error: updateError } = await query.select().single()

    if (updateError) throw new Error(updateError.message)
    if (!updated) throw new Error('バージョン競合が発生しました。ページを更新してください。')

    return NextResponse.json(updated)
  } catch (e) {
    const msg = (e as Error).message
    if (msg.includes('バージョン競合')) {
      return NextResponse.json({ error: msg }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/tasks?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    const { data: task } = await admin
      .from('tasks')
      .select('project_id')
      .eq('id', id)
      .single()

    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const { data: member } = await admin
      .from('project_members')
      .select('role')
      .eq('project_id', task.project_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'editor'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await admin.from('tasks').delete().eq('id', id)
    if (error) throw new Error(error.message)

    return new NextResponse(null, { status: 204 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
