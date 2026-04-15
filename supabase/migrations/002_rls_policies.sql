-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is project member
CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID, p_user_id UUID, p_roles TEXT[] DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_roles IS NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = p_project_id AND user_id = p_user_id
    );
  ELSE
    RETURN EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = p_project_id AND user_id = p_user_id AND role = ANY(p_roles)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: check if task is visible to user via share_scopes
CREATE OR REPLACE FUNCTION is_task_shared(p_task_id UUID, p_phase_id UUID, p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM share_scopes ss
    WHERE ss.project_id = p_project_id
      AND ss.shared_with_user_id = p_user_id
      AND (
        ss.share_type = 'full'
        OR (ss.share_type = 'task' AND p_task_id = ANY(ss.scope_ids))
        OR (ss.share_type = 'phase' AND p_phase_id IS NOT NULL AND p_phase_id = ANY(ss.scope_ids))
      )
      AND (ss.expires_at IS NULL OR ss.expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM project_members pm1
    JOIN project_members pm2 ON pm1.project_id = pm2.project_id
    WHERE pm1.user_id = auth.uid() AND pm2.user_id = id
  ));
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- projects
CREATE POLICY "projects_select" ON projects FOR SELECT
  USING (
    is_project_member(projects.id, auth.uid())
    OR EXISTS (SELECT 1 FROM share_scopes WHERE project_id = projects.id AND shared_with_user_id = auth.uid() AND (expires_at IS NULL OR expires_at > NOW()))
  );
CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "projects_update" ON projects FOR UPDATE
  USING (is_project_member(projects.id, auth.uid(), ARRAY['owner', 'editor']));
CREATE POLICY "projects_delete" ON projects FOR DELETE
  USING (is_project_member(projects.id, auth.uid(), ARRAY['owner']));

-- project_members
CREATE POLICY "members_select" ON project_members FOR SELECT
  USING (is_project_member(project_id, auth.uid()));
CREATE POLICY "members_insert" ON project_members FOR INSERT
  WITH CHECK (is_project_member(project_id, auth.uid(), ARRAY['owner']));
CREATE POLICY "members_delete" ON project_members FOR DELETE
  USING (is_project_member(project_id, auth.uid(), ARRAY['owner']) OR user_id = auth.uid());

-- phases
CREATE POLICY "phases_select" ON phases FOR SELECT
  USING (is_project_member(project_id, auth.uid())
    OR EXISTS (SELECT 1 FROM share_scopes WHERE project_id = phases.project_id AND shared_with_user_id = auth.uid() AND (expires_at IS NULL OR expires_at > NOW())));
CREATE POLICY "phases_insert" ON phases FOR INSERT
  WITH CHECK (is_project_member(project_id, auth.uid(), ARRAY['owner', 'editor']));
CREATE POLICY "phases_update" ON phases FOR UPDATE
  USING (is_project_member(project_id, auth.uid(), ARRAY['owner', 'editor']));
CREATE POLICY "phases_delete" ON phases FOR DELETE
  USING (is_project_member(project_id, auth.uid(), ARRAY['owner']));

-- tasks (most complex RLS)
CREATE POLICY "tasks_select" ON tasks FOR SELECT
  USING (
    is_project_member(project_id, auth.uid(), ARRAY['owner', 'editor', 'viewer'])
    OR is_task_shared(id, phase_id, project_id, auth.uid())
  );
CREATE POLICY "tasks_insert" ON tasks FOR INSERT
  WITH CHECK (is_project_member(project_id, auth.uid(), ARRAY['owner', 'editor'])
    OR EXISTS (SELECT 1 FROM share_scopes WHERE project_id = tasks.project_id AND shared_with_user_id = auth.uid() AND can_edit = TRUE AND (expires_at IS NULL OR expires_at > NOW())));
CREATE POLICY "tasks_update" ON tasks FOR UPDATE
  USING (is_project_member(project_id, auth.uid(), ARRAY['owner', 'editor'])
    OR EXISTS (SELECT 1 FROM share_scopes WHERE project_id = tasks.project_id AND shared_with_user_id = auth.uid() AND can_edit = TRUE AND (expires_at IS NULL OR expires_at > NOW())));
CREATE POLICY "tasks_delete" ON tasks FOR DELETE
  USING (is_project_member(project_id, auth.uid(), ARRAY['owner']));

-- share_scopes
CREATE POLICY "share_scopes_select" ON share_scopes FOR SELECT
  USING (is_project_member(project_id, auth.uid()) OR shared_with_user_id = auth.uid());
CREATE POLICY "share_scopes_insert" ON share_scopes FOR INSERT
  WITH CHECK (is_project_member(project_id, auth.uid(), ARRAY['owner']));
CREATE POLICY "share_scopes_update" ON share_scopes FOR UPDATE
  USING (is_project_member(project_id, auth.uid(), ARRAY['owner']));
CREATE POLICY "share_scopes_delete" ON share_scopes FOR DELETE
  USING (is_project_member(project_id, auth.uid(), ARRAY['owner']));

-- update_requests
CREATE POLICY "update_requests_select" ON update_requests FOR SELECT
  USING (requester_id = auth.uid() OR assignee_id = auth.uid() OR approver_id = auth.uid()
    OR is_project_member(project_id, auth.uid(), ARRAY['owner']));
CREATE POLICY "update_requests_insert" ON update_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid() AND is_project_member(project_id, auth.uid(), ARRAY['owner', 'editor']));
CREATE POLICY "update_requests_update" ON update_requests FOR UPDATE
  USING (assignee_id = auth.uid() OR approver_id = auth.uid()
    OR is_project_member(project_id, auth.uid(), ARRAY['owner']));

-- notifications
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- task_history
CREATE POLICY "task_history_select" ON task_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND is_project_member(t.project_id, auth.uid())));
