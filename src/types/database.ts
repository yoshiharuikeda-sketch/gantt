export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          display_name: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          email?: string
          display_name?: string
          avatar_url?: string | null
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          status: 'active' | 'archived' | 'completed'
          start_date: string | null
          end_date: string | null
          color: string
          project_number: string | null
          client_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
          status?: 'active' | 'archived' | 'completed'
          start_date?: string | null
          end_date?: string | null
          color?: string
          project_number?: string | null
          client_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          status?: 'active' | 'archived' | 'completed'
          start_date?: string | null
          end_date?: string | null
          color?: string
          project_number?: string | null
          client_name?: string | null
          updated_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: 'owner' | 'editor' | 'viewer' | 'limited_viewer'
          invited_by: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role: 'owner' | 'editor' | 'viewer' | 'limited_viewer'
          invited_by?: string | null
          joined_at?: string
        }
        Update: {
          role?: 'owner' | 'editor' | 'viewer' | 'limited_viewer'
        }
      }
      phases: {
        Row: {
          id: string
          project_id: string
          name: string
          display_order: number
          color: string
          start_date: string | null
          end_date: string | null
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          display_order?: number
          color?: string
          start_date?: string | null
          end_date?: string | null
        }
        Update: {
          name?: string
          display_order?: number
          color?: string
          start_date?: string | null
          end_date?: string | null
        }
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          phase_id: string | null
          parent_task_id: string | null
          name: string
          description: string | null
          assignee_id: string | null
          start_date: string | null
          end_date: string | null
          progress: number
          status: 'not_started' | 'in_progress' | 'completed' | 'blocked'
          display_order: number
          dependencies: Json
          version: number
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          phase_id?: string | null
          parent_task_id?: string | null
          name: string
          description?: string | null
          assignee_id?: string | null
          start_date?: string | null
          end_date?: string | null
          progress?: number
          status?: 'not_started' | 'in_progress' | 'completed' | 'blocked'
          display_order?: number
          dependencies?: Json
          version?: number
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          phase_id?: string | null
          name?: string
          description?: string | null
          assignee_id?: string | null
          start_date?: string | null
          end_date?: string | null
          progress?: number
          status?: 'not_started' | 'in_progress' | 'completed' | 'blocked'
          display_order?: number
          dependencies?: Json
          version?: number
          updated_by?: string | null
          updated_at?: string
        }
      }
      share_scopes: {
        Row: {
          id: string
          project_id: string
          shared_with_user_id: string
          share_type: 'task' | 'phase' | 'full'
          scope_ids: string[]
          can_edit: boolean
          expires_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          shared_with_user_id: string
          share_type: 'task' | 'phase' | 'full'
          scope_ids?: string[]
          can_edit?: boolean
          expires_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          share_type?: 'task' | 'phase' | 'full'
          scope_ids?: string[]
          can_edit?: boolean
          expires_at?: string | null
        }
      }
      update_requests: {
        Row: {
          id: string
          task_id: string
          project_id: string
          requester_id: string
          assignee_id: string
          approver_id: string
          request_type: 'schedule' | 'progress' | 'status' | 'general'
          message: string | null
          status: 'pending' | 'submitted' | 'approved' | 'rejected'
          response_data: Json | null
          responded_at: string | null
          approved_at: string | null
          rejection_reason: string | null
          due_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          project_id: string
          requester_id: string
          assignee_id: string
          approver_id: string
          request_type: 'schedule' | 'progress' | 'status' | 'general'
          message?: string | null
          status?: 'pending' | 'submitted' | 'approved' | 'rejected'
          response_data?: Json | null
          responded_at?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          due_date?: string | null
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'submitted' | 'approved' | 'rejected'
          response_data?: Json | null
          responded_at?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          data: Json
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body?: string | null
          data?: Json
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
      }
      task_history: {
        Row: {
          id: string
          task_id: string
          user_id: string | null
          operation: 'create' | 'update' | 'delete'
          changes: Json
          server_timestamp: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id?: string | null
          operation: 'create' | 'update' | 'delete'
          changes: Json
          server_timestamp?: string
        }
        Update: never
      }
    }
    Functions: {
      is_project_member: {
        Args: { p_project_id: string; p_user_id: string; p_roles?: string[] }
        Returns: boolean
      }
      invite_member: {
        Args: { p_project_id: string; p_email: string; p_role: string }
        Returns: Json
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectMember = Database['public']['Tables']['project_members']['Row']
export type Phase = Database['public']['Tables']['phases']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type ShareScope = Database['public']['Tables']['share_scopes']['Row']
export type UpdateRequest = Database['public']['Tables']['update_requests']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type TaskHistory = Database['public']['Tables']['task_history']['Row']

export type TaskStatus = Task['status']
export type ProjectStatus = Project['status']
export type MemberRole = ProjectMember['role']
export type ShareType = ShareScope['share_type']
export type RequestType = UpdateRequest['request_type']
export type RequestStatus = UpdateRequest['status']
