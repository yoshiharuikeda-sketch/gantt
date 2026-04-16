import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPhasesByProject } from '@/lib/repositories/taskRepository'

// GET /api/phases?projectId=xxx
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const phases = await getPhasesByProject(projectId)
    return NextResponse.json(phases)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// POST /api/phases
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { project_id, name, color, start_date, end_date } = body

    if (!project_id || !name) {
      return NextResponse.json({ error: 'project_id and name are required' }, { status: 400 })
    }

    const admin = createAdminClient()

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
      .from('phases')
      .select('display_order')
      .eq('project_id', project_id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = existing ? existing.display_order + 1 : 0

    const { data: phase, error: phaseError } = await admin
      .from('phases')
      .insert({
        project_id,
        name,
        color: color ?? '#6366f1',
        start_date: start_date ?? null,
        end_date: end_date ?? null,
        display_order: nextOrder,
      })
      .select()
      .single()

    if (phaseError) throw new Error(phaseError.message)

    return NextResponse.json(phase, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// PATCH /api/phases
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, ...update } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: phase } = await admin
      .from('phases')
      .select('project_id')
      .eq('id', id)
      .single()

    if (!phase) return NextResponse.json({ error: 'Phase not found' }, { status: 404 })

    const { data: member } = await admin
      .from('project_members')
      .select('role')
      .eq('project_id', phase.project_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'editor'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: updated, error: updateError } = await admin
      .from('phases')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw new Error(updateError.message)

    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// DELETE /api/phases?id=xxx
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

    const { data: phase } = await admin
      .from('phases')
      .select('project_id')
      .eq('id', id)
      .single()

    if (!phase) return NextResponse.json({ error: 'Phase not found' }, { status: 404 })

    const { data: member } = await admin
      .from('project_members')
      .select('role')
      .eq('project_id', phase.project_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'editor'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await admin.from('phases').delete().eq('id', id)
    if (error) throw new Error(error.message)

    return new NextResponse(null, { status: 204 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
