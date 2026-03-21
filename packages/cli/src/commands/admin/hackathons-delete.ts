import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatSuccess } from "../../output.js"

export async function runAdminHackathonsDelete(
  client: OatmealClient,
  id: string,
  options: { yes?: boolean }
): Promise<void> {
  if (!id) {
    console.error("Usage: hackathon admin hackathons delete <id>")
    process.exit(1)
  }

  const hackathon = await client.get<{ name: string }>(`/api/admin/hackathons/${id}`)

  if (!options.yes) {
    const confirmName = await p.text({
      message: `Type the hackathon name to confirm deletion: ${hackathon.name}`,
      placeholder: hackathon.name,
    })
    if (p.isCancel(confirmName) || confirmName !== hackathon.name) {
      p.log.info("Cancelled.")
      return
    }
  }

  await client.delete(`/api/admin/hackathons/${id}`, { body: { confirm_name: hackathon.name } })

  console.log(formatSuccess(`Deleted hackathon "${hackathon.name}"`))
}
