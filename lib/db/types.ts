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
      api_keys: {
        Row: {
          created_at: string
          hash: string
          id: string
          last_used_at: string | null
          name: string
          prefix: string
          revoked_at: string | null
          scopes: string[]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          hash: string
          id?: string
          last_used_at?: string | null
          name: string
          prefix: string
          revoked_at?: string | null
          scopes?: string[]
          tenant_id: string
        }
        Update: {
          created_at?: string
          hash?: string
          id?: string
          last_used_at?: string | null
          name?: string
          prefix?: string
          revoked_at?: string | null
          scopes?: string[]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          actor_type: Database["public"]["Enums"]["actor_type"]
          created_at: string
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id: string
          actor_type: Database["public"]["Enums"]["actor_type"]
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          actor_type?: Database["public"]["Enums"]["actor_type"]
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_participants: {
        Row: {
          clerk_user_id: string
          hackathon_id: string
          id: string
          registered_at: string
          role: Database["public"]["Enums"]["participant_role"]
          team_id: string | null
        }
        Insert: {
          clerk_user_id: string
          hackathon_id: string
          id?: string
          registered_at?: string
          role?: Database["public"]["Enums"]["participant_role"]
          team_id?: string | null
        }
        Update: {
          clerk_user_id?: string
          hackathon_id?: string
          id?: string
          registered_at?: string
          role?: Database["public"]["Enums"]["participant_role"]
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_participants_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathon_sponsors: {
        Row: {
          created_at: string
          display_order: number
          hackathon_id: string
          id: string
          logo_url: string | null
          name: string
          sponsor_tenant_id: string | null
          tier: Database["public"]["Enums"]["sponsor_tier"]
          website_url: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          hackathon_id: string
          id?: string
          logo_url?: string | null
          name: string
          sponsor_tenant_id?: string | null
          tier?: Database["public"]["Enums"]["sponsor_tier"]
          website_url?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          hackathon_id?: string
          id?: string
          logo_url?: string | null
          name?: string
          sponsor_tenant_id?: string | null
          tier?: Database["public"]["Enums"]["sponsor_tier"]
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hackathon_sponsors_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hackathon_sponsors_sponsor_tenant_id_fkey"
            columns: ["sponsor_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      hackathons: {
        Row: {
          allow_solo: boolean | null
          banner_url: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          max_participants: number | null
          max_team_size: number | null
          metadata: Json | null
          min_team_size: number | null
          name: string
          registration_closes_at: string | null
          registration_opens_at: string | null
          rules: string | null
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["hackathon_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allow_solo?: boolean | null
          banner_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          max_participants?: number | null
          max_team_size?: number | null
          metadata?: Json | null
          min_team_size?: number | null
          name: string
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          rules?: string | null
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["hackathon_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allow_solo?: boolean | null
          banner_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          max_participants?: number | null
          max_team_size?: number | null
          metadata?: Json | null
          min_team_size?: number | null
          name?: string
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          rules?: string | null
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["hackathon_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hackathons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      org_api_credentials: {
        Row: {
          account_identifier: string | null
          api_key_encrypted: string
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          last_used_at: string | null
          provider: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_identifier?: string | null
          api_key_encrypted: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          last_used_at?: string | null
          provider: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_identifier?: string | null
          api_key_encrypted?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          last_used_at?: string | null
          provider?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_api_credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      org_integrations: {
        Row: {
          access_token_encrypted: string
          account_email: string | null
          created_at: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token_encrypted: string | null
          scopes: string[] | null
          tenant_id: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted: string
          account_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          tenant_id: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string
          account_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          provider?: Database["public"]["Enums"]["integration_provider"]
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          tenant_id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          agent_id: string | null
          created_at: string
          cron_expression: string | null
          frequency: Database["public"]["Enums"]["schedule_frequency"]
          id: string
          input: Json | null
          is_active: boolean | null
          job_type: string | null
          last_run_at: string | null
          name: string
          next_run_at: string | null
          run_count: number | null
          tenant_id: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          cron_expression?: string | null
          frequency: Database["public"]["Enums"]["schedule_frequency"]
          id?: string
          input?: Json | null
          is_active?: boolean | null
          job_type?: string | null
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          run_count?: number | null
          tenant_id: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          cron_expression?: string | null
          frequency?: Database["public"]["Enums"]["schedule_frequency"]
          id?: string
          input?: Json | null
          is_active?: boolean | null
          job_type?: string | null
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          run_count?: number | null
          tenant_id?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          created_at: string
          demo_video_url: string | null
          description: string | null
          github_url: string | null
          hackathon_id: string
          id: string
          live_app_url: string | null
          metadata: Json | null
          participant_id: string | null
          screenshot_url: string | null
          status: Database["public"]["Enums"]["submission_status"]
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          demo_video_url?: string | null
          description?: string | null
          github_url?: string | null
          hackathon_id: string
          id?: string
          live_app_url?: string | null
          metadata?: Json | null
          participant_id?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          demo_video_url?: string | null
          description?: string | null
          github_url?: string | null
          hackathon_id?: string
          id?: string
          live_app_url?: string | null
          metadata?: Json | null
          participant_id?: string | null
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "hackathon_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_clerk_user_id: string | null
          created_at: string
          email: string
          expires_at: string
          hackathon_id: string
          id: string
          invited_by_clerk_user_id: string
          status: Database["public"]["Enums"]["invitation_status"]
          team_id: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_clerk_user_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          hackathon_id: string
          id?: string
          invited_by_clerk_user_id: string
          status?: Database["public"]["Enums"]["invitation_status"]
          team_id: string
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_clerk_user_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          hackathon_id?: string
          id?: string
          invited_by_clerk_user_id?: string
          status?: Database["public"]["Enums"]["invitation_status"]
          team_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          captain_clerk_user_id: string
          created_at: string
          hackathon_id: string
          id: string
          invite_code: string
          name: string
          status: Database["public"]["Enums"]["team_status"]
          updated_at: string
        }
        Insert: {
          captain_clerk_user_id: string
          created_at?: string
          hackathon_id: string
          id?: string
          invite_code: string
          name: string
          status?: Database["public"]["Enums"]["team_status"]
          updated_at?: string
        }
        Update: {
          captain_clerk_user_id?: string
          created_at?: string
          hackathon_id?: string
          id?: string
          invite_code?: string
          name?: string
          status?: Database["public"]["Enums"]["team_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_hackathon_id_fkey"
            columns: ["hackathon_id"]
            isOneToOne: false
            referencedRelation: "hackathons"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          clerk_org_id: string | null
          clerk_user_id: string | null
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          logo_url_dark: string | null
          name: string
          slug: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          clerk_org_id?: string | null
          clerk_user_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          logo_url_dark?: string | null
          name: string
          slug?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          clerk_org_id?: string | null
          clerk_user_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          logo_url_dark?: string | null
          name?: string
          slug?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempt: number | null
          created_at: string
          delivered_at: string | null
          event: Database["public"]["Enums"]["webhook_event"]
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          webhook_id: string
        }
        Insert: {
          attempt?: number | null
          created_at?: string
          delivered_at?: string | null
          event: Database["public"]["Enums"]["webhook_event"]
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id: string
        }
        Update: {
          attempt?: number | null
          created_at?: string
          delivered_at?: string | null
          event?: Database["public"]["Enums"]["webhook_event"]
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          events: Database["public"]["Enums"]["webhook_event"][]
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_failure_at: string | null
          last_success_at: string | null
          last_triggered_at: string | null
          secret: string
          tenant_id: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          events?: Database["public"]["Enums"]["webhook_event"][]
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_failure_at?: string | null
          last_success_at?: string | null
          last_triggered_at?: string | null
          secret: string
          tenant_id: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          events?: Database["public"]["Enums"]["webhook_event"][]
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_failure_at?: string | null
          last_success_at?: string | null
          last_triggered_at?: string | null
          secret?: string
          tenant_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_team_invitation: {
        Args: { p_clerk_user_id: string; p_token: string }
        Returns: {
          error_code: string
          error_message: string
          hackathon_id: string
          success: boolean
          team_id: string
        }[]
      }
      register_for_hackathon:
        | {
            Args: { p_clerk_user_id: string; p_hackathon_id: string }
            Returns: {
              error_code: string
              error_message: string
              participant_id: string
              success: boolean
            }[]
          }
        | {
            Args: {
              p_clerk_user_id: string
              p_hackathon_id: string
              p_team_name?: string
            }
            Returns: {
              error_code: string
              error_message: string
              participant_id: string
              success: boolean
              team_id: string
            }[]
          }
    }
    Enums: {
      actor_type: "user" | "api_key"
      hackathon_status:
        | "draft"
        | "published"
        | "registration_open"
        | "active"
        | "judging"
        | "completed"
        | "archived"
      integration_provider: "gmail" | "google_calendar" | "notion" | "luma"
      invitation_status:
        | "pending"
        | "accepted"
        | "declined"
        | "expired"
        | "cancelled"
      participant_role: "participant" | "judge" | "mentor" | "organizer"
      schedule_frequency:
        | "once"
        | "hourly"
        | "daily"
        | "weekly"
        | "monthly"
        | "cron"
      sponsor_tier: "title" | "gold" | "silver" | "bronze" | "partner" | "none"
      submission_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "accepted"
        | "rejected"
        | "winner"
      team_status: "forming" | "locked" | "disbanded"
      webhook_event:
        | "hackathon.created"
        | "hackathon.updated"
        | "submission.created"
        | "submission.submitted"
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
    Enums: {
      actor_type: ["user", "api_key"],
      hackathon_status: [
        "draft",
        "published",
        "registration_open",
        "active",
        "judging",
        "completed",
        "archived",
      ],
      integration_provider: ["gmail", "google_calendar", "notion", "luma"],
      invitation_status: [
        "pending",
        "accepted",
        "declined",
        "expired",
        "cancelled",
      ],
      participant_role: ["participant", "judge", "mentor", "organizer"],
      schedule_frequency: [
        "once",
        "hourly",
        "daily",
        "weekly",
        "monthly",
        "cron",
      ],
      sponsor_tier: ["title", "gold", "silver", "bronze", "partner", "none"],
      submission_status: [
        "draft",
        "submitted",
        "under_review",
        "accepted",
        "rejected",
        "winner",
      ],
      team_status: ["forming", "locked", "disbanded"],
      webhook_event: [
        "hackathon.created",
        "hackathon.updated",
        "submission.created",
        "submission.submitted",
      ],
    },
  },
} as const

