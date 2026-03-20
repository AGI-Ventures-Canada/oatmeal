import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"

interface RubricLevel {
  id: string
  criteriaId: string
  levelNumber: number
  label: string
  description?: string
}

interface LevelsUpdateOptions {
  hackathonId?: string
  criteriaId?: string
  levelId?: string
  label?: string
  description?: string
  json?: boolean
}

export function parseLevelsUpdateOptions(args: string[]): LevelsUpdateOptions {
  const options: LevelsUpdateOptions = {}
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--hackathon-id":
        options.hackathonId = args[++i]
        break
      case "--criteria-id":
        options.criteriaId = args[++i]
        break
      case "--level-id":
        options.levelId = args[++i]
        break
      case "--label":
        options.label = args[++i]
        break
      case "--description":
        options.description = args[++i]
        break
      case "--json":
        options.json = true
        break
    }
  }
  return options
}

export async function runLevelsUpdate(
  client: OatmealClient,
  hackathonId: string,
  criteriaId: string,
  levelId: string,
  args: string[]
): Promise<void> {
  const options = parseLevelsUpdateOptions(args)

  const resolvedHackathonId = options.hackathonId ?? hackathonId
  const resolvedCriteriaId = options.criteriaId ?? criteriaId
  const resolvedLevelId = options.levelId ?? levelId

  if (!resolvedHackathonId) {
    console.error("Error: --hackathon-id is required")
    process.exit(1)
  }

  if (!resolvedCriteriaId) {
    console.error("Error: --criteria-id is required")
    process.exit(1)
  }

  if (!resolvedLevelId) {
    console.error("Error: --level-id is required")
    process.exit(1)
  }

  const body: Record<string, unknown> = {}
  if (options.label) body.label = options.label
  if (options.description !== undefined) body.description = options.description

  if (Object.keys(body).length === 0) {
    console.error("Error: provide at least one field to update (--label, --description)")
    process.exit(1)
  }

  const level = await client.patch<RubricLevel>(
    `/api/dashboard/hackathons/${resolvedHackathonId}/judging/criteria/${resolvedCriteriaId}/levels/${resolvedLevelId}`,
    body
  )

  if (options.json) {
    console.log(formatJson(level))
    return
  }

  console.log(formatSuccess(`Updated level "${level.label}"`))
}
