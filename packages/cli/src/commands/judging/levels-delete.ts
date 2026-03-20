import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess, formatTable } from "../../output.js"

interface RubricLevel {
  id: string
  criteriaId: string
  levelNumber: number
  label: string
  description?: string
}

export async function runLevelsDelete(
  client: OatmealClient,
  hackathonId: string,
  criteriaId: string,
  levelId: string,
  options: { yes?: boolean; json?: boolean }
): Promise<void> {
  if (!hackathonId) {
    console.error("Usage: hackathon judging levels delete --hackathon-id <id> --criteria-id <id> --level-id <id>")
    process.exit(1)
  }

  if (!criteriaId) {
    console.error("Usage: hackathon judging levels delete --hackathon-id <id> --criteria-id <id> --level-id <id>")
    process.exit(1)
  }

  if (!levelId) {
    console.error("Usage: hackathon judging levels delete --hackathon-id <id> --criteria-id <id> --level-id <id>")
    process.exit(1)
  }

  if (!options.yes) {
    const confirm = await p.confirm({ message: `Delete level ${levelId}?` })
    if (p.isCancel(confirm) || !confirm) {
      p.log.info("Cancelled.")
      return
    }
  }

  await client.delete(
    `/api/dashboard/hackathons/${hackathonId}/judging/criteria/${criteriaId}/levels/${levelId}`
  )
  console.log(formatSuccess(`Deleted level ${levelId}`))

  const data = await client.get<{ levels: RubricLevel[] }>(
    `/api/dashboard/hackathons/${hackathonId}/judging/criteria/${criteriaId}/levels`
  )

  if (options.json) {
    console.log(formatJson(data))
    return
  }

  if (!data.levels?.length) {
    console.log("No rubric levels remaining.")
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
