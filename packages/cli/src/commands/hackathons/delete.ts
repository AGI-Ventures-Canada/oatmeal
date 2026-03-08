import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatSuccess } from "../../output.js"
import { resolveHackathonId } from "./resolve.js"

export async function runHackathonsDelete(
  client: OatmealClient,
  idOrSlug: string,
  options: { yes?: boolean }
): Promise<void> {
  if (!idOrSlug) {
    console.error("Usage: oatmeal hackathons delete <id-or-slug>")
    process.exit(1)
  }

  const id = await resolveHackathonId(client, idOrSlug)

  if (!options.yes) {
    const confirm = await p.confirm({
      message: `Delete hackathon ${idOrSlug}? This cannot be undone.`,
    })
    if (p.isCancel(confirm) || !confirm) {
      p.log.info("Cancelled.")
      return
    }
  }

  await client.delete(`/api/dashboard/hackathons/${id}`)
  console.log(formatSuccess(`Deleted hackathon ${idOrSlug}`))
}
