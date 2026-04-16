import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/update-requests?projectId=xxx&status=pending
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  const status = req.nextUrl.searchParams.get('status')

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    let query = admin
      .from('update_requests')
      .select('*, tasks(name, start_date, end_date, progress, status)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// POST /api/update-requests — create a request
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { task_id, request_type, message, due_date } = body

    if (!task_id || !request_type) {
      return NextResponse.json({ error: 'task_id and request_type are required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Get task to find assignee and project
    const { data: task } = await admin
      .from('tasks')
      .select('project_id, assignee_id')
      .eq('id', task_id)
      .single()

    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    if (!task.assignee_id) {
      return NextResponse.json({ error: 'タスクに担当者が設定されていません' }, { status: 400 })
    }

    // Verify requester is a member (owner/editor)
    const { data: member } = await admin
      .from('project_members')
      .select('role')
      .eq('project_id', task.project_id)
      .eq('user_id', user.id)
      .single()

    if (!member || !['owner', 'editor'].includes(member.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await admin
      .from('update_requests')
      .insert({
        task_id,
        project_id: task.project_id,
        requester_id: user.id,
        assignee_id: task.assignee_id,
        approver_id: user.id, // requester is the approver
        request_type,
        message: message ?? null,
        status: 'pending',
        due_date: due_date ?? null,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    // Insert notification for assignee
    await admin.from('notifications').insert({
      user_id: task.assignee_id,
      type: 'update_request',
      title: '更新依頼が届いています',
      body: message ?? `タスクの更新を依頼されました`,
      data: { update_request_id: data.id, task_id, project_id: task.project_id },
    })

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

// PATCH /api/update-requests — respond or approve/reject
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, action, response_data, rejection_reason } = body

    // action: 'submit' (assignee responds) | 'approve' | 'reject' (approver decides)

    if (!id || !action) {
      return NextResponse.json({ error: 'id and action are required' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: request } = await admin
      .from('update_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    if (action === 'submit') {
      // Assignee submits their response
      if (user.id !== request.assignee_id) {
        return NextResponse.json({ error: 'Forbidden - only assignee can submit' }, { status: 403 })
      }
      if (request.status !== 'pending') {
        return NextResponse.json({ error: 'Request is not in pending state' }, { status: 400 })
      }

      const { data, error } = await admin
        .from('update_requests')
        .update({
          status: 'submitted',
          response_data: response_data ?? null,
          responded_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)

      // Notify approver
      await admin.from('notifications').insert({
        user_id: request.approver_id,
        type: 'update_submitted',
        title: '更新回答が届いています',
        body: '担当者が更新内容を回答しました。承認してください。',
        data: { update_request_id: id, task_id: request.task_id, project_id: request.project_id },
      })

      return NextResponse.json(data)
    }

    if (action === 'approve' || action === 'reject') {
      // Approver decides
      if (user.id !== request.approver_id) {
        // Also allow project owner to approve
        const { data: member } = await admin
          .from('project_members')
          .select('role')
          .eq('project_id', request.project_id)
          .eq('user_id', user.id)
          .single()

        if (!member || member.role !== 'owner') {
          return NextResponse.json({ error: 'Forbidden - only approver or owner can approve/reject' }, { status: 403 })
        }
      }

      if (request.status !== 'submitted') {
        return NextResponse.json({ error: 'Request is not in submitted state' }, { status: 400 })
      }

      const updatePayload =
        action === 'approve'
          ? { status: 'approved' as const, approved_at: new Date().toISOString() }
          : { status: 'rejected' as const, rejection_reason: rejection_reason ?? null }

      const { data, error } = await admin
        .from('update_requests')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw new Error(error.message)

      // Notify assignee of outcome
      const notifTitle = action === 'approve' ? '更新が承認されました' : '更新が却下されました'
      const notifBody =
        action === 'approve'
          ? 'あなたの更新内容が承認され、Ganttチャートに反映されました。'
          : `更新が却下されました。${rejection_reason ? `理由: ${rejection_reason}` : ''}`

      await admin.from('notifications').insert({
        user_id: request.assignee_id,
        type: action === 'approve' ? 'update_approved' : 'update_rejected',
        title: notifTitle,
        body: notifBody,
        data: { update_request_id: id, task_id: request.task_id, project_id: request.project_id },
      })

      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
