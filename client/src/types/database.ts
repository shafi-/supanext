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
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          metadata?: Json
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
        Args: {}
        Returns: Database['public']['Views']['profile_view']['Row'][]
      }
      get_user_profile: {
        Args: {
          target_user_id: string
        }
        Returns: Database['public']['Views']['profile_view']['Row'][]
      }
      update_my_profile: {
        Args: {
          new_full_name?: string
          new_avatar_url?: string
          new_metadata?: Json
        }
        Returns: Database['public']['Views']['profile_view']['Row'][]
      }
      create_organization: {
        Args: {
          org_name: string
          org_slug: string
          org_description?: string
          org_settings?: Json
        }
        Returns: Database['public']['Views']['organization_view']['Row'][]
      }
      get_my_organizations: {
        Args: {}
        Returns: Database['public']['Views']['organization_view']['Row'][]
      }
      get_organization: {
        Args: {
          target_org_id: string
        }
        Returns: Database['public']['Views']['organization_detail_view']['Row'][]
      }
      update_organization: {
        Args: {
          target_org_id: string
          new_name?: string
          new_slug?: string
          new_description?: string
          new_settings?: Json
        }
        Returns: Database['public']['Views']['organization_view']['Row'][]
      }
      delete_organization: {
        Args: {
          target_org_id: string
        }
        Returns: boolean
      }
      add_organization_member: {
        Args: {
          target_org_id: string
          target_user_email: string
          member_role?: string
        }
        Returns: Database['public']['Views']['member_view']['Row'][]
      }
      remove_organization_member: {
        Args: {
          target_org_id: string
          target_user_id: string
        }
        Returns: boolean
      }
      get_organization_members: {
        Args: {
          target_org_id: string
        }
        Returns: Database['public']['Views']['member_view']['Row'][]
      }
      update_member_role: {
        Args: {
          target_org_id: string
          target_user_id: string
          new_role: string
        }
        Returns: Database['public']['Views']['member_view']['Row'][]
      }
    }
    Enums: {
      _: never
    }
  }
}