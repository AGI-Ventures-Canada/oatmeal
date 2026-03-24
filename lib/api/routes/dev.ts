import { Elysia, t } from "elysia"

const HackathonStatusEnum = t.Union([
  t.Literal("draft"),
  t.Literal("published"),
  t.Literal("registration_open"),
  t.Literal("active"),
  t.Literal("judging"),
  t.Literal("completed"),
  t.Literal("archived"),
])

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
