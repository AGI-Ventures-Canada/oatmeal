export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      actor_type: "user" | "api_key"
      job_status: "queued" | "running" | "succeeded" | "failed" | "canceled"
    }
    CompositeTypes: Record<string, never>
  }
}

export type Tenant = Database["public"]["Tables"]["tenants"]["Row"]
export type ApiKey = Database["public"]["Tables"]["api_keys"]["Row"]
export type Job = Database["public"]["Tables"]["jobs"]["Row"]
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"]
export type JobStatus = Database["public"]["Enums"]["job_status"]
