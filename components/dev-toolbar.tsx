import { auth } from "@clerk/nextjs/server"
import { isAdminEnabled } from "@/lib/auth/principal"
import { TEST_PERSONAS, findPersonaByUserId } from "@/lib/dev/test-personas"
import { DevToolbarClient } from "./dev-toolbar-client"

export async function DevToolbar({ hackathonId }: { hackathonId: string }) {
  if (!isAdminEnabled()) return null

  const { userId, sessionClaims } = await auth()
  if (!userId) return null

  const metadata = (sessionClaims as Record<string, unknown>)?.metadata as
    | Record<string, unknown>
    | undefined
  if (metadata?.admin !== true) return null

  const currentPersona = findPersonaByUserId(userId)

  const allPersonas = TEST_PERSONAS.filter((p) => {
    const id = process.env[p.env] ?? p.fallback
    return !!id
  }).map((p) => ({ key: p.key, name: p.name }))

  if (allPersonas.length === 0) return null

  return (
    <DevToolbarClient
      currentPersonaKey={currentPersona?.key ?? null}
      allPersonas={allPersonas}
      hackathonId={hackathonId}
    />
  )
}
