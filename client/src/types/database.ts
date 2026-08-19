export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          organization_id: string | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          organization_id: string
          role: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: string | null
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          invited_by: string | null
          is_owner: boolean
          joined_at: string | null
          organization_id: string | null
          role: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          is_owner?: boolean
          joined_at?: string | null
          organization_id?: string | null
          role?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          is_owner?: boolean
          joined_at?: string | null
          organization_id?: string | null
          role?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_subscriptions: {
        Row: {
          billing_period: string
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string
          plan_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          billing_period?: string
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id: string
          plan_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          billing_period?: string
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string
          plan_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_system_admin: boolean | null
          metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          is_system_admin?: boolean | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_system_admin?: boolean | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission: string
          role: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission: string
          role: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permission?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "role_view"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "role_permissions_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["name"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system_role: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system_role?: boolean | null
          name?: string
        }
        Relationships: []
      }
      subscription_history: {
        Row: {
          action: string
          amount: number | null
          created_at: string | null
          id: string
          invoice_number: string | null
          notes: string | null
          organization_id: string
          payment_status: string | null
          plan_id: string
        }
        Insert: {
          action: string
          amount?: number | null
          created_at?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          organization_id: string
          payment_status?: string | null
          plan_id: string
        }
        Update: {
          action?: string
          amount?: number | null
          created_at?: string | null
          id?: string
          invoice_number?: string | null
          notes?: string | null
          organization_id?: string
          payment_status?: string | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_history_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      todos: {
        Row: {
          completed: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          organization_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "todos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "todos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      member_view: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          joined_at: string | null
          organization_id: string | null
          role: string | null
          status: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_detail_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_detail_view: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          logo_url: string | null
          member_count: number | null
          name: string | null
          settings: Json | null
          slug: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      organization_view: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          joined_at: string | null
          logo_url: string | null
          membership_status: string | null
          name: string | null
          settings: Json | null
          slug: string | null
          updated_at: string | null
          user_id: string | null
          user_role: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_view: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      role_view: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          is_system_role: boolean | null
          name: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_system_role?: boolean | null
          name?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_system_role?: boolean | null
          name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invite: { Args: { p_token: string }; Returns: boolean }
      add_organization_member: {
        Args: {
          member_role?: string
          target_org_id: string
          target_user_email: string
        }
        Returns: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          joined_at: string | null
          organization_id: string | null
          role: string | null
          status: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "member_view"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      audit_action: {
        Args: {
          action_name: string
          audit_metadata?: Json
          audit_org_id: string
          audit_user_id: string
          p_resource_id?: string
          p_resource_type?: string
        }
        Returns: string
      }
      bootstrap_system_admin: { Args: never; Returns: boolean }
      can_perform: {
        Args: { p_org_id: string; permission_name: string }
        Returns: boolean
      }
      cancel_subscription: { Args: { p_org_id: string }; Returns: boolean }
      change_plan: {
        Args: {
          p_billing_period: string
          p_new_plan_id: string
          p_org_id: string
        }
        Returns: {
          billing_period: string
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string
          plan_id: string
          status: string
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organization_subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_invite: {
        Args: { p_email: string; p_organization_id: string; p_role?: string }
        Returns: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          organization_id: string
          role: string | null
          token: string
        }[]
        SetofOptions: {
          from: "*"
          to: "invites"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_organization: {
        Args: {
          org_description?: string
          org_name: string
          org_settings?: Json
          org_slug: string
        }
        Returns: {
          created_at: string | null
          description: string | null
          id: string | null
          joined_at: string | null
          logo_url: string | null
          membership_status: string | null
          name: string | null
          settings: Json | null
          slug: string | null
          updated_at: string | null
          user_id: string | null
          user_role: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "organization_view"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_subscription_plan: {
        Args: {
          p_description: string
          p_features: Json
          p_name: string
          p_price_monthly: number
          p_price_yearly: number
        }
        Returns: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "subscription_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_test_user: {
        Args: {
          test_email: string
          test_full_name?: string
          test_org_name?: string
        }
        Returns: string
      }
      create_todo: {
        Args: {
          p_description?: string
          p_organization_id: string
          p_title: string
        }
        Returns: {
          completed: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          organization_id: string
          title: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "todos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      delete_organization: { Args: { target_org_id: string }; Returns: boolean }
      delete_todo: { Args: { p_todo_id: string }; Returns: boolean }
      get_all_organizations: {
        Args: never
        Returns: {
          created_at: string | null
          description: string | null
          id: string | null
          logo_url: string | null
          member_count: number | null
          name: string | null
          settings: Json | null
          slug: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "organization_detail_view"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_invites: {
        Args: { p_organization_id: string }
        Returns: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          organization_id: string
          role: string | null
          token: string
        }[]
        SetofOptions: {
          from: "*"
          to: "invites"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_membership: {
        Args: { p_org_id: string }
        Returns: {
          is_active: boolean
          is_owner: boolean
          permissions: string[]
          role: string
        }[]
      }
      get_my_organizations: {
        Args: never
        Returns: {
          created_at: string | null
          description: string | null
          id: string | null
          joined_at: string | null
          logo_url: string | null
          membership_status: string | null
          name: string | null
          settings: Json | null
          slug: string | null
          updated_at: string | null
          user_id: string | null
          user_role: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "organization_view"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_profile: {
        Args: never
        Returns: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          is_system_admin: boolean | null
          metadata: Json | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_subscription: {
        Args: { p_org_id: string }
        Returns: {
          billing_period: string
          current_period_end: string
          current_period_start: string
          description: string
          features: Json
          id: string
          plan_id: string
          plan_name: string
          price_monthly: number
          price_yearly: number
          status: string
        }[]
      }
      get_organization: {
        Args: { target_org_id: string }
        Returns: {
          created_at: string | null
          description: string | null
          id: string | null
          logo_url: string | null
          member_count: number | null
          name: string | null
          settings: Json | null
          slug: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "organization_detail_view"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_organization_members: {
        Args: { target_org_id: string }
        Returns: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          joined_at: string | null
          organization_id: string | null
          role: string | null
          status: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "member_view"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_organization_subscriptions: {
        Args: never
        Returns: {
          billing_period: string
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          org_name: string
          organization_id: string
          plan_name: string
          price_monthly: number
          price_yearly: number
          status: string
        }[]
      }
      get_public_org_by_slug: {
        Args: { org_slug: string }
        Returns: {
          created_at: string
          description: string
          id: string
          name: string
          slug: string
        }[]
      }
      get_subscription_history: {
        Args: { p_org_id: string }
        Returns: {
          action: string
          amount: number
          created_at: string
          id: string
          invoice_number: string
          notes: string
          org_name: string
          organization_id: string
          payment_status: string
          plan_name: string
        }[]
      }
      get_subscription_plans: {
        Args: never
        Returns: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "subscription_plans"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_system_admins: {
        Args: never
        Returns: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          metadata: Json | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profile_view"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_system_stats: {
        Args: never
        Returns: {
          recent_signups: number
          total_members: number
          total_orgs: number
          total_users: number
        }[]
      }
      get_todos: {
        Args: { p_organization_id: string }
        Returns: {
          completed: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          organization_id: string
          title: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "todos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_user_profile: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          metadata: Json | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profile_view"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      grant_system_admin: { Args: { target_user_id: string }; Returns: boolean }
      has_feature: {
        Args: { p_feature: string; p_org_id: string }
        Returns: boolean
      }
      is_system_admin: { Args: never; Returns: boolean }
      pause_subscription: { Args: { p_org_id: string }; Returns: boolean }
      remove_organization_member: {
        Args: { target_org_id: string; target_user_id: string }
        Returns: boolean
      }
      reset_development_data: { Args: never; Returns: undefined }
      revoke_invite: { Args: { p_invite_id: string }; Returns: boolean }
      revoke_system_admin: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      set_system_admin: { Args: { p_user_id: string }; Returns: boolean }
      subscribe_to_plan: {
        Args: { p_billing_period: string; p_org_id: string; p_plan_id: string }
        Returns: {
          billing_period: string
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string
          plan_id: string
          status: string
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organization_subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unpause_subscription: { Args: { p_org_id: string }; Returns: boolean }
      update_member_role: {
        Args: {
          new_role: string
          target_org_id: string
          target_user_id: string
        }
        Returns: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          joined_at: string | null
          organization_id: string | null
          role: string | null
          status: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "member_view"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_my_profile: {
        Args: {
          new_avatar_url?: string
          new_full_name?: string
          new_metadata?: Json
        }
        Returns: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          metadata: Json | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profile_view"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_organization: {
        Args: {
          new_description?: string
          new_name?: string
          new_settings?: Json
          new_slug?: string
          target_org_id: string
        }
        Returns: {
          created_at: string | null
          description: string | null
          id: string | null
          joined_at: string | null
          logo_url: string | null
          membership_status: string | null
          name: string | null
          settings: Json | null
          slug: string | null
          updated_at: string | null
          user_id: string | null
          user_role: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "organization_view"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_subscription_plan: {
        Args: {
          p_description: string
          p_features: Json
          p_is_active: boolean
          p_name: string
          p_plan_id: string
          p_price_monthly: number
          p_price_yearly: number
        }
        Returns: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "subscription_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_todo: {
        Args: {
          p_completed?: boolean
          p_description?: string
          p_title?: string
          p_todo_id: string
        }
        Returns: {
          completed: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          organization_id: string
          title: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "todos"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      validate_invite: {
        Args: { p_token: string }
        Returns: {
          invite_email: string
          invite_id: string
          invite_role: string
          org_id: string
          org_name: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

