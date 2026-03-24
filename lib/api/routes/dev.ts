import { Elysia, t } from "elysia"
import { HackathonStatusEnum } from "@/lib/api/validators"

export const devRoutes = new Elysia({ prefix: "/dev" }).patch(
  "/hackathons/:id/status",
  async ({ params, body, set }) => {
    const { updateHackathonSettings } = await import("@/lib/services/public-hackathons")
    const { supabase } = await import("@/lib/db/client")

    const db = supabase()
    const { data: row } = await db
      .from("hackathons")
      .select("tenant_id")
      .eq("id", params.id)
      .single()

    if (!row) {
      set.status = 404
      return { error: "Hackathon not found" }
    }

    const hackathon = await updateHackathonSettings(params.id, row.tenant_id, {
      status: body.status,
    })

    if (!hackathon) {
      set.status = 500
      return { error: "Update failed" }
    }

    if (process.env.DEBUG) console.log(`[dev] hackathon ${params.id} status → ${hackathon.status}`)
    return { id: hackathon.id, status: hackathon.status }
  },
  {
    body: t.Object({ status: HackathonStatusEnum }),
  }
)
