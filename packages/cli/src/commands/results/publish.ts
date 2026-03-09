import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatSuccess } from "../../output.js"

export async function runResultsPublish(
  client: OatmealClient,
  hackathonId: string,
  options: { yes?: boolean }
): Promise<void> {
  if (!hackathonId) {
    console.error("Usage: hackathon results publish <hackathon-id>")
    process.exit(1)
  }

  if (!options.yes) {
    const confirm = await p.confirm({
      message: "Publish results? This will make them visible to participants.",
    })
    if (p.isCancel(confirm) || !confirm) {
      p.log.info("Cancelled.")
      return
    }
  }

  await client.post(`/api/dashboard/hackathons/${hackathonId}/results/publish`)
  console.log(formatSuccess("Results published"))
}
