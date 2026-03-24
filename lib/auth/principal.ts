import { auth } from "@clerk/nextjs/server"
import { supabase as getSupabase } from "@/lib/db/client"
import type { AdminPrincipal, ApiKeyPrincipal, Principal, PrincipalKindMap, Scope } from "./types"
import { ADMIN_SCOPES, scopesForRole } from "./types"
import { verifyApiKey } from "@/lib/services/api-keys"
import { getOrCreateTenant, getOrCreatePersonalTenant } from "@/lib/services/tenants"

export function isAdminEnabled(): boolean {
  return process.env.ADMIN_ENABLED === "true"
}

const principalCache = new WeakMap<Request, Principal>()

type ClerkSession = Awaited<ReturnType<typeof auth>>
const clerkSessionCache = new WeakMap<Request, ClerkSession>()

/**
 * Pre-resolve Clerk auth at the Next.js route handler level where
 * AsyncLocalStorage context is guaranteed, before passing to Elysia.
 * Elysia's code-generated handlers can lose the Next.js async context,
 * causing auth() to return { userId: null } inside derive hooks.
 */
export async function preResolveAuth(request: Request): Promise<void> {
  if (request.headers.get("authorization")?.startsWith("Bearer sk_")) return
  try {
    const session = await auth()
    clerkSessionCache.set(request, session)
    const path = new URL(request.url).pathname
    if (!session.userId) {
      const hasCookie = (request.headers.get("cookie") ?? "").includes("__session")
      const authKeys = Object.keys(session).filter((k) => (session as Record<string, unknown>)[k] != null)
      console.error("[auth:pre]", path, "userId=null", `cookie=${hasCookie}`, `authKeys=[${authKeys}]`)
    }
  } catch (err) {
    console.error("[auth:pre] failed:", err instanceof Error ? err.message : err)
  }
}

export async function resolvePrincipal(request: Request): Promise<Principal> {
  const cached = principalCache.get(request)
  if (cached) return cached

  const principal = await resolvePrincipalUncached(request)
  principalCache.set(request, principal)
  return principal
}

async function resolvePrincipalUncached(request: Request): Promise<Principal> {
  const authHeader = request.headers.get("authorization")

  if (authHeader?.startsWith("Bearer sk_")) {
    const token = authHeader.slice(7)
    const apiKey = await verifyApiKey(token)
    if (!apiKey) {
      return { kind: "anon" }
    }
    await getSupabase()
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", apiKey.id)

    return {
      kind: "api_key",
      tenantId: apiKey.tenant_id,
      keyId: apiKey.id,
      scopes: apiKey.scopes as Scope[],
    }
  }

  let session
  try {
    session = clerkSessionCache.get(request) ?? await auth()
  } catch (err) {
    console.error("[auth] Clerk auth() threw:", err instanceof Error ? err.message : err)
    return { kind: "anon" }
  }

  const { userId, orgId, orgRole } = session
  if (!userId) {
    console.error("[auth] No userId from Clerk session", { path: new URL(request.url).pathname })
    return { kind: "anon" }
  }

  const metadata = (session.sessionClaims as Record<string, unknown>)?.metadata as
    | Record<string, unknown>
    | undefined
  if (isAdminEnabled() && metadata?.admin === true) {
    return {
      kind: "admin",
      userId,
      scopes: ADMIN_SCOPES,
    }
  }

  let tenant
  try {
    if (orgId) {
      tenant = await getOrCreateTenant(orgId)
    } else {
      tenant = await getOrCreatePersonalTenant(userId)
    }
  } catch (err) {
    console.error("[auth] Tenant resolution failed:", { userId, orgId, error: err instanceof Error ? err.message : err })
    return { kind: "anon" }
  }

  if (!tenant) {
    console.error("[auth] Tenant is null after getOrCreate:", { userId, orgId })
    return { kind: "anon" }
  }

  return {
    kind: "user",
    tenantId: tenant.id,
    userId,
    orgId: orgId ?? null,
    orgRole: orgId ? (orgRole ?? "org:member") : null,
    scopes: scopesForRole(orgId ? (orgRole ?? "org:member") : null),
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401
  ) {
    super(message)
    this.name = "AuthError"
  }
}

const ADMIN_API_KEY_SCOPES: Scope[] = ["admin:read", "admin:write", "admin:scenarios"]

// Outer gate: confirms admin is enabled and the principal holds at least one admin scope.
// Per-endpoint scope enforcement is done separately via requireAdminScopes — keep both checks;
// collapsing them would either over-restrict (blocking valid admin Clerk sessions) or
// under-restrict (skipping scope verification on specific endpoints).
export function requireAdmin(principal: Principal): asserts principal is AdminPrincipal | ApiKeyPrincipal {
  if (!isAdminEnabled()) {
    throw new AuthError("Not found", 404)
  }
  if (principal.kind === "admin") {
    return
  }
  if (
    principal.kind === "api_key" &&
    ADMIN_API_KEY_SCOPES.some((s) => principal.scopes.includes(s))
  ) {
    return
  }
  throw new AuthError("Forbidden", 403)
}

export function requireAdminScopes(principal: AdminPrincipal | ApiKeyPrincipal, scopes: Scope[]): void {
  for (const scope of scopes) {
    if (!principal.scopes.includes(scope)) {
      throw new AuthError(`Missing required scope: ${scope}`, 403)
    }
  }
}

export function requirePrincipal<K extends Exclude<Principal["kind"], "anon">>(
  principal: Principal,
  allowedKinds: K[],
  requiredScopes: Scope[] = []
): asserts principal is PrincipalKindMap[K] {
  if (!allowedKinds.includes(principal.kind as K)) {
    throw new AuthError("Unauthorized", 401)
  }

  if (principal.kind === "anon") {
    throw new AuthError("Unauthorized", 401)
  }

  for (const scope of requiredScopes) {
    if (!principal.scopes.includes(scope)) {
      throw new AuthError(`Missing required scope: ${scope}`, 403)
    }
  }
}
