import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProjectMembers } from '@/lib/repositories/projectRepository'

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

    const admin = createAdminClient()

    // Only owner/editor can invite
    const { data: member } = await admin
      .from('project_members')
      .select('role')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'editor'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Look up user by email via profiles
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    }

    // Check if already a member
    const { data: existing } = await admin
      .from('project_members')
      .select('id')
      .eq('project_id', project_id)
      .eq('user_id', profile.id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'すでにメンバーです' }, { status: 409 })
    }

    const { data: newMember, error: insertError } = await admin
      .from('project_members')
      .insert({
        project_id,
        user_id: profile.id,
        role,
        invited_by: user.id,
      })
      .select()
      .single()

    if (insertError) throw new Error(insertError.message)

    return NextResponse.json(newMember, { status: 201 })
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

    const admin = createAdminClient()

    const { data: member } = await admin
      .from('project_members')
      .select('role')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .single()

    if (!member || member.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden - only owner can change roles' }, { status: 403 })
    }

    const { error } = await admin
      .from('project_members')
      .update({ role })
      .eq('project_id', project_id)
      .eq('user_id', user_id)

    if (error) throw new Error(error.message)

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

    const admin = createAdminClient()

    const { data: member } = await admin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    // Owner can remove anyone; non-owners can only remove themselves
    if (!member || (member.role !== 'owner' && user.id !== targetUserId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await admin
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', targetUserId)

    if (error) throw new Error(error.message)

    return new NextResponse(null, { status: 204 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
