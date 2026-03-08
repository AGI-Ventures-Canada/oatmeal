import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatSuccess } from "../../output.js"

export async function runJudgeDisplayDelete(
  client: OatmealClient,
  hackathonId: string,
  profileId: string,
  options: { yes?: boolean }
): Promise<void> {
  if (!profileId) {
    console.error("Usage: oatmeal judge-display delete <hackathon-id> <profile-id>")
    process.exit(1)
  }

  if (!options.yes) {
    const confirm = await p.confirm({ message: `Delete judge display profile ${profileId}?` })
    if (p.isCancel(confirm) || !confirm) {
      p.log.info("Cancelled.")
      return
    }
  }

  await client.delete(
    `/api/dashboard/hackathons/${hackathonId}/judges/display/${profileId}`
  )
  console.log(formatSuccess(`Deleted judge display profile ${profileId}`))
}
