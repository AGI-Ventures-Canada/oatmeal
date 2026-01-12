import type { Scope } from "@/lib/auth/types"

export type ApiKeyDisplay = {
  id: string
  name: string
  prefix: string
  scopes: string[]
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

export type ApiKeyListItem = {
  id: string
  name: string
  prefix: string
  scopes: Scope[]
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

export type CreateApiKeyResponse = {
  id: string
  name: string
  prefix: string
  scopes: Scope[]
  createdAt: string
  key: string
}

export type JobListItem = {
  id: string
  type: string
  status: "queued" | "running" | "succeeded" | "failed" | "canceled"
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export type JobDetail = JobListItem & {
  input: unknown
  result: unknown
  error: unknown
}
