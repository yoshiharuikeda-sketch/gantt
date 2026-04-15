import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProjectMembers, updateMemberRole, removeMember } from '@/lib/repositories/projectRepository'

// GET /api/members?projectId=xxx
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const members = await getProjectMembers(projectId)
    return NextResponse.json(members)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// POST /api/members — invite by email
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { project_id, email, role } = body

    if (!project_id || !email || !role) {
      return NextResponse.json({ error: 'project_id, email, and role are required' }, { status: 400 })
    }

    // Only owner/editor can invite
    const { data: member } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'editor'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Call the RPC function defined in migration 003
    const { data, error } = await supabase.rpc('invite_member', {
      p_project_id: project_id,
      p_email: email,
      p_role: role,
    })

    if (error) throw new Error(error.message)

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// PATCH /api/members — update role
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { project_id, user_id, role } = body

    if (!project_id || !user_id || !role) {
      return NextResponse.json({ error: 'project_id, user_id, and role are required' }, { status: 400 })
    }

    const { data: member } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .single()

    if (!member || member.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden - only owner can change roles' }, { status: 403 })
    }

    await updateMemberRole(project_id, user_id, role)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// DELETE /api/members?projectId=xxx&userId=xxx
export async function DELETE(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  const targetUserId = req.nextUrl.searchParams.get('userId')

  if (!projectId || !targetUserId) {
    return NextResponse.json({ error: 'projectId and userId are required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: member } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    // Owner can remove anyone; non-owners can only remove themselves
    if (!member || (member.role !== 'owner' && user.id !== targetUserId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await removeMember(projectId, targetUserId)
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
