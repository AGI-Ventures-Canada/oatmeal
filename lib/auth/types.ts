export type Scope =
  | "keys:read"
  | "keys:write"
  | "webhooks:read"
  | "webhooks:write"
  | "hackathons:read"
  | "hackathons:write"
  | "teams:read"
  | "teams:write"
  | "submissions:read"
  | "submissions:write"
  | "analytics:read"
  | "schedules:read"
  | "schedules:write"
  | "org:read"
  | "org:write"

export const ALL_SCOPES: Scope[] = [
  "keys:read",
  "keys:write",
  "webhooks:read",
  "webhooks:write",
  "hackathons:read",
  "hackathons:write",
  "teams:read",
  "teams:write",
  "submissions:read",
  "submissions:write",
  "analytics:read",
  "schedules:read",
  "schedules:write",
  "org:read",
  "org:write",
]

export const DEFAULT_API_KEY_SCOPES: Scope[] = [
  "hackathons:read",
  "teams:read",
  "submissions:read",
  "submissions:write",
  "webhooks:read",
  "webhooks:write",
  "schedules:read",
  "org:read",
]

export type UserPrincipal = {
  kind: "user"
  tenantId: string
  userId: string
  orgId: string | null
  orgRole: string | null
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

export function scopesForRole(role: string | null): Scope[] {
  if (role === "org:admin") {
    return ALL_SCOPES
  }
  return ["hackathons:read", "teams:read", "submissions:read"]
}

export function hasScope(principal: Principal, scope: Scope): boolean {
  if (principal.kind === "anon") return false
  return principal.scopes.includes(scope)
}

export function hasAllScopes(principal: Principal, scopes: Scope[]): boolean {
  return scopes.every((s) => hasScope(principal, s))
}
