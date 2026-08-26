export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  api: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string }
      approve_organization: { Args: { p_org_id: string }; Returns: undefined }
      assign_subscription: {
        Args: {
          p_ends_at?: string
          p_org_id: string
          p_plan_id: string
          p_starts_at?: string
          p_status?: "trialing" | "active" | "past_due" | "canceled" | "expired"
        }
        Returns: string
      }
      bootstrap_system_admin: { Args: never; Returns: boolean }
      change_member_role: {
        Args: {
          p_org_id?: string
          p_role: "admin" | "member"
          p_user_id: string
        }
        Returns: undefined
      }
      create_campaign: {
        Args: {
          p_currency?: string
          p_description?: string
          p_ends_at?: string
          p_goal_minor?: number
          p_name: string
          p_org_id?: string
          p_starts_at?: string
        }
        Returns: string
      }
      create_plan: {
        Args: {
          p_billing_interval: string
          p_code: string
          p_currency: string
          p_description: string
          p_name: string
          p_price_minor: number
        }
        Returns: string
      }
      deactivate_subscription: {
        Args: { p_org_id: string }
        Returns: undefined
      }
      delete_campaign: { Args: { p_campaign_id: string }; Returns: undefined }
      find_user_id_by_email: { Args: { p_email: string }; Returns: string }
      get_current_subscription: { Args: { p_org_id?: string }; Returns: Json }
      get_invitation_preview: { Args: { p_token: string }; Returns: Json }
      get_my_organizations: { Args: never; Returns: Json }
      get_organization_members: { Args: { p_org_id?: string }; Returns: Json }
      get_organization_status: { Args: never; Returns: Json }
      get_session_context: { Args: never; Returns: Json }
      grant_system_admin: { Args: { p_user_id: string }; Returns: undefined }
      invite_member: {
        Args: {
          p_email: string
          p_org_id?: string
          p_role?: "admin" | "member"
        }
        Returns: Json
      }
      list_all_organizations: { Args: { p_limit?: number }; Returns: Json }
      list_campaigns: { Args: { p_org_id?: string }; Returns: Json }
      list_plans: { Args: never; Returns: Json }
      list_public_organizations: { Args: { p_limit?: number }; Returns: Json }
      reject_organization: {
        Args: { p_note?: string; p_org_id: string }
        Returns: undefined
      }
      remove_member: {
        Args: { p_org_id?: string; p_user_id: string }
        Returns: undefined
      }
      request_organization: {
        Args: { p_name: string; p_slug: string }
        Returns: string
      }
      revoke_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      revoke_system_admin: { Args: { p_user_id: string }; Returns: undefined }
      set_active_organization: { Args: { p_org_id: string }; Returns: Json }
      set_member_permission: {
        Args: {
          p_granted: boolean
          p_org_id?: string
          p_permission: string
          p_user_id: string
        }
        Returns: undefined
      }
      set_plan_feature: {
        Args: { p_enabled: boolean; p_feature_code: string; p_plan_id: string }
        Returns: undefined
      }
      suspend_organization: {
        Args: { p_note: string; p_org_id: string }
        Returns: undefined
      }
      unsuspend_organization: { Args: { p_org_id: string }; Returns: undefined }
      update_campaign: {
        Args: {
          p_campaign_id: string
          p_currency?: string
          p_description?: string
          p_ends_at?: string
          p_goal_minor?: number
          p_name?: string
          p_starts_at?: string
        }
        Returns: undefined
      }
      update_my_profile: {
        Args: { p_avatar_url?: string; p_display_name?: string }
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
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  api: {
    Enums: {},
  },
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

