export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      email_templates: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean
          html: string
          id: string
          key: string
          name: string
          subject: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean
          html: string
          id?: string
          key: string
          name: string
          subject: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean
          html?: string
          id?: string
          key?: string
          name?: string
          subject?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      license_events: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_type: string
          id: string
          metadata: Json | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "license_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_states: {
        Row: {
          created_at: string
          created_by: string | null
          nonce: string
          provider: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          nonce: string
          provider: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          nonce?: string
          provider?: string
          tenant_id?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string | null
          credits_assigned: number
          custom_domain: string | null
          deploy_account_id: string | null
          deploy_account_name: string | null
          deploy_connected: boolean | null
          deploy_platform: string | null
          deploy_project_id: string | null
          deploy_project_name: string | null
          deploy_url: string | null
          expires_at: string
          id: string
          notes: string | null
          onboarding_done: boolean | null
          onboarding_step: number | null
          owner_email: string
          owner_name: string | null
          panel_version: string | null
          plan: string
          status: string
          supabase_connected: boolean | null
          supabase_db_url: string | null
          supabase_project_id: string | null
          supabase_project_name: string | null
          supabase_region: string | null
          tenant_token: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credits_assigned?: number
          custom_domain?: string | null
          deploy_account_id?: string | null
          deploy_account_name?: string | null
          deploy_connected?: boolean | null
          deploy_platform?: string | null
          deploy_project_id?: string | null
          deploy_project_name?: string | null
          deploy_url?: string | null
          expires_at: string
          id?: string
          notes?: string | null
          onboarding_done?: boolean | null
          onboarding_step?: number | null
          owner_email: string
          owner_name?: string | null
          panel_version?: string | null
          plan?: string
          status?: string
          supabase_connected?: boolean | null
          supabase_db_url?: string | null
          supabase_project_id?: string | null
          supabase_project_name?: string | null
          supabase_region?: string | null
          tenant_token?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credits_assigned?: number
          custom_domain?: string | null
          deploy_account_id?: string | null
          deploy_account_name?: string | null
          deploy_connected?: boolean | null
          deploy_platform?: string | null
          deploy_project_id?: string | null
          deploy_project_name?: string | null
          deploy_url?: string | null
          expires_at?: string
          id?: string
          notes?: string | null
          onboarding_done?: boolean | null
          onboarding_step?: number | null
          owner_email?: string
          owner_name?: string | null
          panel_version?: string | null
          plan?: string
          status?: string
          supabase_connected?: boolean | null
          supabase_db_url?: string | null
          supabase_project_id?: string | null
          supabase_project_name?: string | null
          supabase_region?: string | null
          tenant_token?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_email: { Args: never; Returns: string }
      get_my_tenant: {
        Args: never
        Returns: {
          created_at: string
          credits_assigned: number
          custom_domain: string
          deploy_connected: boolean
          deploy_platform: string
          deploy_url: string
          expires_at: string
          id: string
          notes: string
          onboarding_done: boolean
          onboarding_step: number
          owner_email: string
          owner_name: string
          panel_version: string
          plan: string
          status: string
          supabase_connected: boolean
          tenant_token: string
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "superadmin"
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
  public: {
    Enums: {
      app_role: ["superadmin"],
    },
  },
} as const
