import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getTasksByProject,
  createTask,
  updateTask,
  deleteTask,
} from '@/lib/repositories/taskRepository'

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

    // Verify access
    const { data: member } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'editor'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const task = await createTask({
      project_id,
      name,
      phase_id: phase_id ?? null,
      start_date: start_date ?? null,
      end_date: end_date ?? null,
      assignee_id: assignee_id ?? null,
      description: description ?? null,
    })

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

    // Check task exists and user has access
    const { data: task } = await supabase
      .from('tasks')
      .select('project_id')
      .eq('id', id)
      .single()

    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const { data: member } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', task.project_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'editor'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await updateTask(id, update, version)
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

    const { data: task } = await supabase
      .from('tasks')
      .select('project_id')
      .eq('id', id)
      .single()

    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const { data: member } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', task.project_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'editor'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deleteTask(id)
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
