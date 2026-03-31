import { auth } from "@clerk/nextjs/server"
import { isAdminEnabled } from "@/lib/auth/principal"
import { TEST_PERSONAS, findPersonaByUserId } from "@/lib/dev/test-personas"
import { getActiveScenarios } from "@/lib/services/admin-scenarios"
import { supabase } from "@/lib/db/client"
import { DevToolbarClient } from "./dev-toolbar-client"

export async function DevToolbar() {
  if (!isAdminEnabled()) return null

  const { userId } = await auth()
  if (!userId) return null

  const session = await auth()
  const metadata = (session.sessionClaims as Record<string, unknown>)?.metadata as
    | Record<string, unknown>
    | undefined
  if (metadata?.admin !== true) return null

  const currentPersona = findPersonaByUserId(userId)

  const personaRoles: Record<string, string> = {}
  const activeScenarios = await getActiveScenarios()
  if (activeScenarios.length > 0) {
    const db = supabase()
    const { data: participants } = await db
      .from("hackathon_participants")
      .select("clerk_user_id, role")
      .in("hackathon_id", activeScenarios.map((s) => s.hackathonId))
    for (const p of participants ?? []) {
      const persona = findPersonaByUserId(p.clerk_user_id)
      if (persona && !personaRoles[persona.key]) {
        personaRoles[persona.key] = p.role
      }
    }
  }

  const allPersonas = TEST_PERSONAS.filter((p) => {
    const id = process.env[p.env] ?? p.fallback
    return !!id
  }).map((p) => ({ key: p.key, name: p.name, role: personaRoles[p.key] ?? null }))

  if (allPersonas.length === 0) return null

  return (
    <DevToolbarClient
      currentPersona={
        currentPersona
          ? { key: currentPersona.key, name: currentPersona.name, role: personaRoles[currentPersona.key] ?? null }
          : null
      }
      allPersonas={allPersonas}
    />
  )
}
