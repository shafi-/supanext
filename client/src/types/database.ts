// Auto-generated from Supabase schema
// Run: supabase gen types typescript > src/types/database.ts

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
          full_name: string | null
          avatar_url: string | null
          metadata: Json
          is_system_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          metadata?: Json
          is_system_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          metadata?: Json
          is_system_admin?: boolean
          updated_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          description: string | null
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          description?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          description?: string | null
          settings?: Json
          updated_at?: string
        }
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: string
          status: string
          invited_by: string | null
          joined_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: string
          status?: string
          invited_by?: string | null
          joined_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: string
          status?: string
          invited_by?: string | null
          joined_at?: string
          updated_at?: string
        }
      }
      roles: {
        Row: {
          id: string
          name: string
          description: string | null
          permissions: string[]
          is_system_role: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          permissions?: string[]
          is_system_role?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          permissions?: string[]
          is_system_role?: boolean
        }
      }
      todos: {
        Row: {
          id: string
          organization_id: string
          title: string
          description: string | null
          completed: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          title: string
          description?: string | null
          completed?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          description?: string | null
          completed?: boolean
          updated_at?: string
        }
      }
      invites: {
        Row: {
          id: string
          organization_id: string
          email: string
          token: string
          role: string | null
          invited_by: string | null
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          token?: string
          role?: string | null
          invited_by?: string | null
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          token?: string
          role?: string | null
          invited_by?: string | null
          expires_at?: string
          accepted_at?: string | null
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          organization_id: string | null
          action: string
          resource_type: string | null
          resource_id: string | null
          metadata: Json
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          organization_id?: string | null
          action: string
          resource_type?: string | null
          resource_id?: string | null
          metadata?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          organization_id?: string | null
          action?: string
          resource_type?: string | null
          resource_id?: string | null
          metadata?: Json
          ip_address?: string | null
          user_agent?: string | null
        }
      }
    }
    Views: {
      profile_view: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
      }
      organization_view: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          description: string | null
          settings: Json
          created_at: string
          updated_at: string
          user_id: string
          user_role: string
          membership_status: string
          joined_at: string
        }
      }
      organization_detail_view: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          description: string | null
          settings: Json
          created_at: string
          updated_at: string
          member_count: number
        }
      }
      member_view: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: string
          status: string
          joined_at: string
          created_at: string
        }
      }
    }
    Functions: {
      get_my_profile: {
        Args: Record<string, never>
        Returns: Database['public']['Views']['profile_view']['Row'][]
      }
      get_user_profile: {
        Args: { target_user_id: string }
        Returns: Database['public']['Views']['profile_view']['Row'][]
      }
      update_my_profile: {
        Args: { new_full_name?: string; new_avatar_url?: string; new_metadata?: Json }
        Returns: Database['public']['Views']['profile_view']['Row'][]
      }
      create_organization: {
        Args: { org_name: string; org_slug: string; org_description?: string; org_settings?: Json }
        Returns: Database['public']['Views']['organization_view']['Row'][]
      }
      get_my_organizations: {
        Args: Record<string, never>
        Returns: Database['public']['Views']['organization_view']['Row'][]
      }
      get_organization: {
        Args: { target_org_id: string }
        Returns: Database['public']['Views']['organization_detail_view']['Row'][]
      }
      update_organization: {
        Args: { target_org_id: string; new_name?: string; new_slug?: string; new_description?: string; new_settings?: Json }
        Returns: Database['public']['Views']['organization_view']['Row'][]
      }
      delete_organization: {
        Args: { target_org_id: string }
        Returns: boolean
      }
      add_organization_member: {
        Args: { target_org_id: string; target_user_email: string; member_role?: string }
        Returns: Database['public']['Views']['member_view']['Row'][]
      }
      remove_organization_member: {
        Args: { target_org_id: string; target_user_id: string }
        Returns: boolean
      }
      get_organization_members: {
        Args: { target_org_id: string }
        Returns: Database['public']['Views']['member_view']['Row'][]
      }
      update_member_role: {
        Args: { target_org_id: string; target_user_id: string; new_role: string }
        Returns: Database['public']['Views']['member_view']['Row'][]
      }
      get_membership: {
        Args: { p_org_id: string }
        Returns: { role: string; permissions: string[]; is_active: boolean }[]
      }
      get_org_stats: {
        Args: { p_org_id: string }
        Returns: { member_count: number; todo_count: number; completed_todos: number }[]
      }
      create_todo: {
        Args: { p_organization_id: string; p_title: string; p_description?: string }
        Returns: Database['public']['Tables']['todos']['Row'][]
      }
      get_todos: {
        Args: { p_organization_id: string }
        Returns: Database['public']['Tables']['todos']['Row'][]
      }
      update_todo: {
        Args: { p_todo_id: string; p_title?: string; p_description?: string; p_completed?: boolean }
        Returns: Database['public']['Tables']['todos']['Row'][]
      }
      delete_todo: {
        Args: { p_todo_id: string }
        Returns: boolean
      }
      create_invite: {
        Args: { p_organization_id: string; p_email: string; p_role?: string }
        Returns: Database['public']['Tables']['invites']['Row'][]
      }
      get_invites: {
        Args: { p_organization_id: string }
        Returns: Database['public']['Tables']['invites']['Row'][]
      }
      validate_invite: {
        Args: { p_token: string }
        Returns: { invite_id: string; org_id: string; org_name: string; invite_email: string; invite_role: string }[]
      }
      accept_invite: {
        Args: { p_token: string }
        Returns: boolean
      }
      get_system_stats: {
        Args: Record<string, never>
        Returns: { total_orgs: number; total_users: number; total_members: number; recent_signups: number }[]
      }
      get_all_organizations: {
        Args: Record<string, never>
        Returns: Database['public']['Views']['organization_detail_view']['Row'][]
      }
      update_jwt_claims: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: {
      _: never
    }
  }
}

// Helper types for common patterns
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row']
