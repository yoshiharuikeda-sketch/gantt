-- Trigger: Apply approved update_request to task
CREATE OR REPLACE FUNCTION apply_approved_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'submitted' THEN
    UPDATE tasks SET
      progress   = COALESCE((NEW.response_data->>'progress')::integer, progress),
      start_date = COALESCE((NEW.response_data->>'start_date')::date, start_date),
      end_date   = COALESCE((NEW.response_data->>'end_date')::date, end_date),
      status     = COALESCE(NEW.response_data->>'status', status),
      updated_at = NOW(),
      updated_by = NEW.approver_id
    WHERE id = NEW.task_id;

    -- Create notification for assignee
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      NEW.assignee_id,
      'update_request_approved',
      '更新が承認されました',
      '送信した更新内容がタスクに反映されました。',
      jsonb_build_object('update_request_id', NEW.id, 'task_id', NEW.task_id, 'project_id', NEW.project_id)
    );
  END IF;

  IF NEW.status = 'rejected' AND OLD.status = 'submitted' THEN
    -- Create notification for assignee
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      NEW.assignee_id,
      'update_request_rejected',
      '更新が却下されました',
      COALESCE(NEW.rejection_reason, '更新リクエストが却下されました。'),
      jsonb_build_object('update_request_id', NEW.id, 'task_id', NEW.task_id, 'project_id', NEW.project_id)
    );
  END IF;

  IF NEW.status = 'submitted' AND OLD.status = 'pending' THEN
    -- Create notification for approver
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      NEW.approver_id,
      'update_request_submitted',
      '更新リクエストへの回答が届きました',
      '担当者が更新内容を送信しました。確認・承認してください。',
      jsonb_build_object('update_request_id', NEW.id, 'task_id', NEW.task_id, 'project_id', NEW.project_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_update_request_status_change
  AFTER UPDATE ON update_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION apply_approved_update();

-- Trigger: Log task changes to history
CREATE OR REPLACE FUNCTION log_task_change()
RETURNS TRIGGER AS $$
DECLARE
  changes_json JSONB := '{}'::jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Record only changed fields
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      changes_json = changes_json || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    END IF;
    IF OLD.start_date IS DISTINCT FROM NEW.start_date THEN
      changes_json = changes_json || jsonb_build_object('start_date', jsonb_build_object('old', OLD.start_date, 'new', NEW.start_date));
    END IF;
    IF OLD.end_date IS DISTINCT FROM NEW.end_date THEN
      changes_json = changes_json || jsonb_build_object('end_date', jsonb_build_object('old', OLD.end_date, 'new', NEW.end_date));
    END IF;
    IF OLD.progress IS DISTINCT FROM NEW.progress THEN
      changes_json = changes_json || jsonb_build_object('progress', jsonb_build_object('old', OLD.progress, 'new', NEW.progress));
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      changes_json = changes_json || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      changes_json = changes_json || jsonb_build_object('assignee_id', jsonb_build_object('old', OLD.assignee_id, 'new', NEW.assignee_id));
    END IF;

    IF changes_json != '{}'::jsonb THEN
      INSERT INTO task_history (task_id, user_id, operation, changes)
      VALUES (NEW.id, NEW.updated_by, 'update', changes_json);
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO task_history (task_id, user_id, operation, changes)
    VALUES (NEW.id, NEW.updated_by, 'create', jsonb_build_object('name', NEW.name));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_task_change
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_change();

-- Function: invite member by email
CREATE OR REPLACE FUNCTION invite_member(
  p_project_id UUID,
  p_email TEXT,
  p_role TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_member_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO v_user_id FROM profiles WHERE email = p_email;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found', 'email', p_email);
  END IF;

  -- Check if already a member
  IF EXISTS (SELECT 1 FROM project_members WHERE project_id = p_project_id AND user_id = v_user_id) THEN
    RETURN jsonb_build_object('error', 'Already a member');
  END IF;

  -- Insert member
  INSERT INTO project_members (project_id, user_id, role, invited_by)
  VALUES (p_project_id, v_user_id, p_role, auth.uid())
  RETURNING id INTO v_member_id;

  -- Notify the invited user
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_user_id,
    'project_invitation',
    'プロジェクトに招待されました',
    'プロジェクトへの参加招待が届いています。',
    jsonb_build_object('project_id', p_project_id, 'role', p_role)
  );

  RETURN jsonb_build_object('success', true, 'member_id', v_member_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
