import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/update-requests/detail?id=xxx
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    const { data, error } = await admin
      .from('update_requests')
      .select('*, tasks(name, start_date, end_date, progress, status)')
      .eq('id', id)
      .single()

    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Only allow assignee or approver to view
    if (user.id !== data.assignee_id && user.id !== data.approver_id) {
      // Also allow project owner
      const { data: member } = await admin
        .from('project_members')
        .select('role')
        .eq('project_id', data.project_id)
        .eq('user_id', user.id)
        .single()
      if (!member || member.role !== 'owner') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
