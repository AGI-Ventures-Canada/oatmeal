import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"

export async function runAdminHackathonsUpdate(
  client: OatmealClient,
  id: string,
  args: string[],
  options: { json?: boolean }
): Promise<void> {
  if (!id) {
    console.error("Usage: hackathon admin hackathons update <id> [--name <name>] [--status <status>] ...")
    process.exit(1)
  }

  const body: Record<string, unknown> = {}

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--name":
        body.name = args[++i]
        break
      case "--slug":
        body.slug = args[++i]
        break
      case "--status":
        body.status = args[++i]
        break
      case "--description":
        body.description = args[++i]
        break
      case "--starts-at":
        body.starts_at = args[++i]
        break
      case "--ends-at":
        body.ends_at = args[++i]
        break
      case "--registration-opens-at":
        body.registration_opens_at = args[++i]
        break
      case "--registration-closes-at":
        body.registration_closes_at = args[++i]
        break
      case "--min-team-size":
        body.min_team_size = Number(args[++i])
        break
      case "--max-team-size":
        body.max_team_size = Number(args[++i])
        break
      case "--max-participants":
        body.max_participants = Number(args[++i])
        break
      case "--allow-solo":
        body.allow_solo = args[++i] !== "false"
        break
      case "--anonymous-judging":
        body.anonymous_judging = args[++i] !== "false"
        break
      case "--location-type":
        body.location_type = args[++i]
        break
      case "--location-name":
        body.location_name = args[++i]
        break
      case "--location-url":
        body.location_url = args[++i]
        break
    }
  }

  if (Object.keys(body).length === 0) {
    console.error("No fields to update. Provide at least one flag like --name or --status.")
    process.exit(1)
  }

  const updated = await client.patch(`/api/admin/hackathons/${id}`, body)

  if (options.json) {
    console.log(formatJson(updated))
    return
  }

  console.log(formatSuccess(`Updated hackathon ${id}`))
}
