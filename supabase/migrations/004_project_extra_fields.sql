-- Add extra fields to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_number text,
  ADD COLUMN IF NOT EXISTS client_name    text;
