import { auth } from "@clerk/nextjs/server"
import { supabase as getSupabase } from "@/lib/db/client"
import type { Principal, PrincipalKindMap, Scope } from "./types"
import { scopesForRole } from "./types"
import { verifyApiKey } from "@/lib/services/api-keys"
import { getOrCreateTenant } from "@/lib/services/tenants"

export async function resolvePrincipal(request: Request): Promise<Principal> {
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

  const { userId, orgId, orgRole } = await auth()
  if (!userId || !orgId) {
    return { kind: "anon" }
  }

  const tenant = await getOrCreateTenant(orgId)
  if (!tenant) {
    return { kind: "anon" }
  }

  return {
    kind: "user",
    tenantId: tenant.id,
    userId,
    orgId,
    orgRole: orgRole ?? "org:member",
    scopes: scopesForRole(orgRole ?? "org:member"),
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
