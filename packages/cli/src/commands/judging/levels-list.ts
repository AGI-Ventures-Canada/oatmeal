import type { OatmealClient } from "../../client.js"
import { formatJson, formatTable } from "../../output.js"
import type { RubricLevel } from "../../types.js"

export async function runLevelsList(
  client: OatmealClient,
  hackathonId: string,
  criteriaId: string,
  options: { json?: boolean }
): Promise<void> {
  if (!hackathonId) {
    console.error("Usage: hackathon judging levels list --hackathon-id <id> --criteria-id <id>")
    process.exit(1)
  }

  if (!criteriaId) {
    console.error("Usage: hackathon judging levels list --hackathon-id <id> --criteria-id <id>")
    process.exit(1)
  }

  const data = await client.get<{ levels: RubricLevel[] }>(
    `/api/dashboard/hackathons/${hackathonId}/judging/criteria/${criteriaId}/levels`
  )

  if (options.json) {
    console.log(formatJson(data))
    return
  }

  if (!data.levels?.length) {
    console.log("No rubric levels found.")
    return
  }

  console.log(
    formatTable(data.levels, [
      { key: "levelNumber", label: "Level #" },
      { key: "label", label: "Label" },
      { key: "description", label: "Description" },
    ])
  )
}
