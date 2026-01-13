export type Scope =
  | "jobs:create"
  | "jobs:read"
  | "jobs:cancel"
  | "keys:read"
  | "keys:write"
  | "agents:read"
  | "agents:run"
  | "agents:manage"
  | "skills:read"
  | "skills:write"
  | "webhooks:read"
  | "webhooks:write"
  | "schedules:read"
  | "schedules:write"

export const ALL_SCOPES: Scope[] = [
  "jobs:create",
  "jobs:read",
  "jobs:cancel",
  "keys:read",
  "keys:write",
  "agents:read",
  "agents:run",
  "agents:manage",
  "skills:read",
  "skills:write",
  "webhooks:read",
  "webhooks:write",
  "schedules:read",
  "schedules:write",
]

export const DEFAULT_API_KEY_SCOPES: Scope[] = ["jobs:create", "jobs:read", "agents:read", "agents:run"]

export type UserPrincipal = {
  kind: "user"
  tenantId: string
  userId: string
  orgId: string
  orgRole: string
  scopes: Scope[]
}

export type ApiKeyPrincipal = {
  kind: "api_key"
  tenantId: string
  keyId: string
  scopes: Scope[]
}

export type AnonPrincipal = {
  kind: "anon"
}

export type Principal = UserPrincipal | ApiKeyPrincipal | AnonPrincipal

export type PrincipalKindMap = {
  user: UserPrincipal
  api_key: ApiKeyPrincipal
  anon: AnonPrincipal
}

export function scopesForRole(role: string): Scope[] {
  if (role === "org:admin") {
    return ALL_SCOPES
  }
  return ["jobs:read", "keys:read"]
}

export function hasScope(principal: Principal, scope: Scope): boolean {
  if (principal.kind === "anon") return false
  return principal.scopes.includes(scope)
}

export function hasAllScopes(principal: Principal, scopes: Scope[]): boolean {
  return scopes.every((s) => hasScope(principal, s))
}
