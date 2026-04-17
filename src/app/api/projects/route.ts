import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProjectsByUser } from '@/lib/repositories/projectRepository'

// GET /api/projects
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const projects = await getProjectsByUser(user.id)
    return NextResponse.json(projects)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// POST /api/projects
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, description, color, start_date, end_date } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: project, error: projectError } = await admin
      .from('projects')
      .insert({
        name,
        description: description ?? null,
        owner_id: user.id,
        color: color ?? '#3B82F6',
        start_date: start_date ?? null,
        end_date: end_date ?? null,
      })
      .select()
      .single()

    if (projectError) throw new Error(projectError.message)

    await admin.from('project_members').insert({
      project_id: project.id,
      user_id: user.id,
      role: 'owner',
      invited_by: user.id,
    })

    return NextResponse.json(project, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// PATCH /api/projects
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, name, description, color, status, start_date, end_date, project_number, client_name } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Only owner can update project settings
    const { data: member } = await admin
      .from('project_members')
      .select('role')
      .eq('project_id', id)
      .eq('user_id', user.id)
      .single()

    if (!member || member.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const update = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(color !== undefined && { color }),
      ...(status !== undefined && { status }),
      ...(start_date !== undefined && { start_date }),
      ...(end_date !== undefined && { end_date }),
      ...(project_number !== undefined && { project_number }),
      ...(client_name !== undefined && { client_name }),
    }

    const { data: project, error: updateError } = await admin
      .from('projects')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw new Error(updateError.message)
    return NextResponse.json(project)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// DELETE /api/projects?id=xxx
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

    const { data: member } = await admin
      .from('project_members')
      .select('role')
      .eq('project_id', id)
      .eq('user_id', user.id)
      .single()

    if (!member || member.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error: deleteError } = await admin.from('projects').delete().eq('id', id)
    if (deleteError) throw new Error(deleteError.message)
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
