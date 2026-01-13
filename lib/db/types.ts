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
      agent_runs: {
        Row: {
          agent_id: string
          completed_at: string | null
          created_at: string
          created_by_key_id: string | null
          error: Json | null
          id: string
          input: Json | null
          job_id: string | null
          output: Json | null
          sandbox_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["agent_run_status"]
          steps: Json[] | null
          tenant_id: string
          token_usage: Json | null
          trigger_type: Database["public"]["Enums"]["trigger_type"]
          workflow_run_id: string | null
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          created_at?: string
          created_by_key_id?: string | null
          error?: Json | null
          id?: string
          input?: Json | null
          job_id?: string | null
          output?: Json | null
          sandbox_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["agent_run_status"]
          steps?: Json[] | null
          tenant_id: string
          token_usage?: Json | null
          trigger_type?: Database["public"]["Enums"]["trigger_type"]
          workflow_run_id?: string | null
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          created_at?: string
          created_by_key_id?: string | null
          error?: Json | null
          id?: string
          input?: Json | null
          job_id?: string | null
          output?: Json | null
          sandbox_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["agent_run_status"]
          steps?: Json[] | null
          tenant_id?: string
          token_usage?: Json | null
          trigger_type?: Database["public"]["Enums"]["trigger_type"]
          workflow_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_created_by_key_id_fkey"
            columns: ["created_by_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          config: Json | null
          created_at: string
          description: string | null
          id: string
          instructions: string | null
          is_active: boolean | null
          max_steps: number | null
          model: string
          name: string
          skill_ids: string[] | null
          tenant_id: string
          timeout_ms: number | null
          type: Database["public"]["Enums"]["agent_type"]
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          max_steps?: number | null
          model?: string
          name: string
          skill_ids?: string[] | null
          tenant_id: string
          timeout_ms?: number | null
          type?: Database["public"]["Enums"]["agent_type"]
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          max_steps?: number | null
          model?: string
          name?: string
          skill_ids?: string[] | null
          tenant_id?: string
          timeout_ms?: number | null
          type?: Database["public"]["Enums"]["agent_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
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
      email_addresses: {
        Row: {
          address: string
          agent_id: string | null
          created_at: string
          domain: string
          id: string
          is_active: boolean | null
          is_custom_domain: boolean | null
          local_part: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address: string
          agent_id?: string | null
          created_at?: string
          domain: string
          id?: string
          is_active?: boolean | null
          is_custom_domain?: boolean | null
          local_part: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string
          agent_id?: string | null
          created_at?: string
          domain?: string
          id?: string
          is_active?: boolean | null
          is_custom_domain?: boolean | null
          local_part?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_addresses_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_addresses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_emails: {
        Row: {
          agent_run_id: string | null
          attachments: Json | null
          body_html: string | null
          body_text: string | null
          email_address_id: string
          from_address: string
          id: string
          received_at: string
          resend_email_id: string
          subject: string | null
        }
        Insert: {
          agent_run_id?: string | null
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          email_address_id: string
          from_address: string
          id?: string
          received_at?: string
          resend_email_id: string
          subject?: string | null
        }
        Update: {
          agent_run_id?: string | null
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          email_address_id?: string
          from_address?: string
          id?: string
          received_at?: string
          resend_email_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_emails_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_emails_email_address_id_fkey"
            columns: ["email_address_id"]
            isOneToOne: false
            referencedRelation: "email_addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by_key_id: string | null
          error: Json | null
          id: string
          idempotency_key: string | null
          input: Json | null
          result: Json | null
          status_cache: Database["public"]["Enums"]["job_status"]
          tenant_id: string
          type: string
          updated_at: string
          workflow_run_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by_key_id?: string | null
          error?: Json | null
          id?: string
          idempotency_key?: string | null
          input?: Json | null
          result?: Json | null
          status_cache?: Database["public"]["Enums"]["job_status"]
          tenant_id: string
          type: string
          updated_at?: string
          workflow_run_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by_key_id?: string | null
          error?: Json | null
          id?: string
          idempotency_key?: string | null
          input?: Json | null
          result?: Json | null
          status_cache?: Database["public"]["Enums"]["job_status"]
          tenant_id?: string
          type?: string
          updated_at?: string
          workflow_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_created_by_key_id_fkey"
            columns: ["created_by_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      luma_webhook_configs: {
        Row: {
          agent_id: string | null
          calendar_id: string | null
          created_at: string
          event_types: Database["public"]["Enums"]["luma_event_type"][]
          id: string
          is_active: boolean | null
          tenant_id: string
          updated_at: string
          webhook_token: string
        }
        Insert: {
          agent_id?: string | null
          calendar_id?: string | null
          created_at?: string
          event_types?: Database["public"]["Enums"]["luma_event_type"][]
          id?: string
          is_active?: boolean | null
          tenant_id: string
          updated_at?: string
          webhook_token: string
        }
        Update: {
          agent_id?: string | null
          calendar_id?: string | null
          created_at?: string
          event_types?: Database["public"]["Enums"]["luma_event_type"][]
          id?: string
          is_active?: boolean | null
          tenant_id?: string
          updated_at?: string
          webhook_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "luma_webhook_configs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "luma_webhook_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      luma_webhook_events: {
        Row: {
          agent_run_id: string | null
          config_id: string
          event_type: Database["public"]["Enums"]["luma_event_type"]
          id: string
          payload: Json
          received_at: string
        }
        Insert: {
          agent_run_id?: string | null
          config_id: string
          event_type: Database["public"]["Enums"]["luma_event_type"]
          id?: string
          payload: Json
          received_at?: string
        }
        Update: {
          agent_run_id?: string | null
          config_id?: string
          event_type?: Database["public"]["Enums"]["luma_event_type"]
          id?: string
          payload?: Json
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "luma_webhook_events_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "luma_webhook_events_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "luma_webhook_configs"
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
          provider: Database["public"]["Enums"]["api_credential_provider"]
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          account_identifier?: string | null
          api_key_encrypted: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          last_used_at?: string | null
          provider: Database["public"]["Enums"]["api_credential_provider"]
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          account_identifier?: string | null
          api_key_encrypted?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          last_used_at?: string | null
          provider?: Database["public"]["Enums"]["api_credential_provider"]
          tenant_id?: string
          updated_at?: string | null
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
      sandbox_sessions: {
        Row: {
          agent_run_id: string | null
          created_at: string
          daytona_sandbox_id: string
          env_vars_encrypted: Json | null
          id: string
          snapshot_id: string | null
          status: string
          tenant_id: string
          terminated_at: string | null
        }
        Insert: {
          agent_run_id?: string | null
          created_at?: string
          daytona_sandbox_id: string
          env_vars_encrypted?: Json | null
          id?: string
          snapshot_id?: string | null
          status?: string
          tenant_id: string
          terminated_at?: string | null
        }
        Update: {
          agent_run_id?: string | null
          created_at?: string
          daytona_sandbox_id?: string
          env_vars_encrypted?: Json | null
          id?: string
          snapshot_id?: string | null
          status?: string
          tenant_id?: string
          terminated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sandbox_sessions_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sandbox_sessions_tenant_id_fkey"
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
            foreignKeyName: "schedules_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          content: string
          created_at: string
          description: string | null
          id: string
          is_builtin: boolean | null
          name: string
          references_content: Json | null
          scripts_content: Json | null
          slug: string
          tenant_id: string
          updated_at: string
          version: number | null
        }
        Insert: {
          content: string
          created_at?: string
          description?: string | null
          id?: string
          is_builtin?: boolean | null
          name: string
          references_content?: Json | null
          scripts_content?: Json | null
          slug: string
          tenant_id: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_builtin?: boolean | null
          name?: string
          references_content?: Json | null
          scripts_content?: Json | null
          slug?: string
          tenant_id?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "skills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          clerk_org_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          clerk_org_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          clerk_org_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
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
      [_ in never]: never
    }
    Enums: {
      actor_type: "user" | "api_key"
      api_credential_provider: "luma"
      agent_run_status:
        | "queued"
        | "initializing"
        | "running"
        | "awaiting_input"
        | "succeeded"
        | "failed"
        | "canceled"
        | "timed_out"
      agent_type: "ai_sdk" | "claude_sdk"
      integration_provider: "gmail" | "google_calendar" | "notion" | "luma"
      job_status: "queued" | "running" | "succeeded" | "failed" | "canceled"
      luma_event_type:
        | "event.created"
        | "event.updated"
        | "guest.registered"
        | "guest.updated"
        | "ticket.registered"
      schedule_frequency:
        | "once"
        | "hourly"
        | "daily"
        | "weekly"
        | "monthly"
        | "cron"
      trigger_type: "manual" | "scheduled" | "email" | "luma_webhook"
      webhook_event:
        | "agent_run.started"
        | "agent_run.completed"
        | "agent_run.failed"
        | "agent_run.step_completed"
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
      api_credential_provider: ["luma"],
      agent_run_status: [
        "queued",
        "initializing",
        "running",
        "awaiting_input",
        "succeeded",
        "failed",
        "canceled",
        "timed_out",
      ],
      agent_type: ["ai_sdk", "claude_sdk"],
      integration_provider: ["gmail", "google_calendar", "notion", "luma"],
      job_status: ["queued", "running", "succeeded", "failed", "canceled"],
      luma_event_type: [
        "event.created",
        "event.updated",
        "guest.registered",
        "guest.updated",
        "ticket.registered",
      ],
      schedule_frequency: [
        "once",
        "hourly",
        "daily",
        "weekly",
        "monthly",
        "cron",
      ],
      trigger_type: ["manual", "scheduled", "email", "luma_webhook"],
      webhook_event: [
        "agent_run.started",
        "agent_run.completed",
        "agent_run.failed",
        "agent_run.step_completed",
      ],
    },
  },
} as const

// Helper type aliases for common table rows
export type ApiKey = Database["public"]["Tables"]["api_keys"]["Row"]
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"]
export type Tenant = Database["public"]["Tables"]["tenants"]["Row"]
export type Job = Database["public"]["Tables"]["jobs"]["Row"]
export type Agent = Database["public"]["Tables"]["agents"]["Row"]
export type AgentRun = Database["public"]["Tables"]["agent_runs"]["Row"]
export type Schedule = Database["public"]["Tables"]["schedules"]["Row"]
export type Webhook = Database["public"]["Tables"]["webhooks"]["Row"]
export type Skill = Database["public"]["Tables"]["skills"]["Row"]

// Helper type aliases for enums
export type JobStatus = Database["public"]["Enums"]["job_status"]
export type AgentRunStatus = Database["public"]["Enums"]["agent_run_status"]
export type TriggerType = Database["public"]["Enums"]["trigger_type"]
export type ActorType = Database["public"]["Enums"]["actor_type"]
export type ScheduleFrequency = Database["public"]["Enums"]["schedule_frequency"]
export type WebhookEvent = Database["public"]["Enums"]["webhook_event"]
export type LumaEventType = Database["public"]["Enums"]["luma_event_type"]
export type IntegrationProvider = Database["public"]["Enums"]["integration_provider"]
export type ApiCredentialProvider = Database["public"]["Enums"]["api_credential_provider"]

// Table row types
export type OrgApiCredential = Database["public"]["Tables"]["org_api_credentials"]["Row"]

