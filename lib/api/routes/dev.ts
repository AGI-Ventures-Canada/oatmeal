import { Elysia, t } from "elysia"
import { HackathonStatusEnum } from "@/lib/api/validators"

// No auth: only mounted when NODE_ENV === "development" (see lib/api/index.ts).
// Never add this route to a production-visible mount.
export const devRoutes = new Elysia({ prefix: "/dev" }).patch(
  "/hackathons/:id/status",
  async ({ params, body }) => {
    const { updateHackathonSettings } = await import("@/lib/services/public-hackathons")
    const { supabase } = await import("@/lib/db/client")

    const db = supabase()
    const { data: row } = await db
      .from("hackathons")
      .select("tenant_id")
      .eq("id", params.id)
      .single()

    if (!row) {
      return new Response(JSON.stringify({ error: "Hackathon not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    const hackathon = await updateHackathonSettings(params.id, row.tenant_id, {
      status: body.status,
    })

    if (!hackathon) {
      return new Response(JSON.stringify({ error: "Update failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log(`[dev] hackathon ${params.id} status → ${hackathon.status}`)
    return { id: hackathon.id, status: hackathon.status }
  },
  {
    body: t.Object({ status: HackathonStatusEnum }),
  }
)
