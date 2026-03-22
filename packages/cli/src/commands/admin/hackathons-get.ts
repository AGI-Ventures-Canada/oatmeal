import type { OatmealClient } from "../../client.js"
import { formatJson } from "../../output.js"
import pc from "picocolors"

interface AdminHackathonDetail {
  id: string
  name: string
  slug: string
  status: string
  tenant_id: string
  description: string | null
  starts_at: string | null
  ends_at: string | null
  registration_opens_at: string | null
  registration_closes_at: string | null
  min_team_size: number | null
  max_team_size: number | null
  max_participants: number | null
  allow_solo: boolean | null
  anonymous_judging: boolean
  location_type: string | null
  location_name: string | null
  location_url: string | null
  results_published_at: string | null
  created_at: string
}

export async function runAdminHackathonsGet(
  client: OatmealClient,
  id: string,
  options: { json?: boolean }
): Promise<void> {
  if (!id) {
    console.error("Usage: hackathon admin hackathons get <id>")
    process.exit(1)
  }

  const hackathon = await client.get<AdminHackathonDetail>(`/api/admin/hackathons/${id}`)

  if (options.json) {
    console.log(formatJson(hackathon))
    return
  }

  console.log(`\n${pc.bold(hackathon.name)} (${hackathon.slug})`)
  console.log(`  ID:        ${hackathon.id}`)
  console.log(`  Tenant:    ${hackathon.tenant_id}`)
  console.log(`  Status:    ${hackathon.status}`)
  if (hackathon.description) console.log(`  Desc:      ${hackathon.description}`)
  console.log(`  Starts:    ${hackathon.starts_at ?? "—"}`)
  console.log(`  Ends:      ${hackathon.ends_at ?? "—"}`)
  console.log(`  Reg opens: ${hackathon.registration_opens_at ?? "—"}`)
  console.log(`  Reg closes:${hackathon.registration_closes_at ?? "—"}`)
  console.log(`  Team size: ${hackathon.min_team_size ?? "—"}–${hackathon.max_team_size ?? "—"}`)
  console.log(`  Max pax:   ${hackathon.max_participants ?? "unlimited"}`)
  console.log(`  Solo:      ${hackathon.allow_solo ? "yes" : "no"}`)
  console.log(`  Anon judging: ${hackathon.anonymous_judging ? "yes" : "no"}`)
  if (hackathon.location_type) console.log(`  Location:  ${hackathon.location_type} — ${hackathon.location_name ?? ""}`)
  if (hackathon.results_published_at) console.log(`  Published: ${hackathon.results_published_at}`)
  console.log(`  Created:   ${hackathon.created_at}`)
}
