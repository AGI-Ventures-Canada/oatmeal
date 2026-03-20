import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"

interface RubricLevel {
  id: string
  criteriaId: string
  levelNumber: number
  label: string
  description?: string
}

interface LevelsAddOptions {
  hackathonId?: string
  criteriaId?: string
  label?: string
  description?: string
  json?: boolean
}

export function parseLevelsAddOptions(args: string[]): LevelsAddOptions {
  const options: LevelsAddOptions = {}
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--hackathon-id":
        options.hackathonId = args[++i]
        break
      case "--criteria-id":
        options.criteriaId = args[++i]
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

export async function runLevelsAdd(
  client: OatmealClient,
  hackathonId: string,
  criteriaId: string,
  args: string[]
): Promise<void> {
  const options = parseLevelsAddOptions(args)

  const resolvedHackathonId = options.hackathonId ?? hackathonId
  const resolvedCriteriaId = options.criteriaId ?? criteriaId

  if (!resolvedHackathonId) {
    console.error("Error: --hackathon-id is required")
    process.exit(1)
  }

  if (!resolvedCriteriaId) {
    console.error("Error: --criteria-id is required")
    process.exit(1)
  }

  if (!options.label) {
    console.error("Error: --label is required")
    process.exit(1)
  }

  const level = await client.post<RubricLevel>(
    `/api/dashboard/hackathons/${resolvedHackathonId}/judging/criteria/${resolvedCriteriaId}/levels`,
    {
      label: options.label,
      description: options.description,
    }
  )

  if (options.json) {
    console.log(formatJson(level))
    return
  }

  console.log(formatSuccess(`Added level "${level.label}" (${level.id})`))
}
