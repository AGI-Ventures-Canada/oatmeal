import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess, formatWarning } from "../../output.js"
import type { JudgingCriteria } from "../../types.js"

interface CriteriaUpdateOptions {
  name?: string
  description?: string
  maxScore?: number
  weight?: number
  category?: "core" | "bonus"
  json?: boolean
}

export function parseCriteriaUpdateOptions(args: string[]): CriteriaUpdateOptions {
  const options: CriteriaUpdateOptions = {}
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--name":
        options.name = args[++i]
        break
      case "--description":
        options.description = args[++i]
        break
      case "--max-score":
        options.maxScore = parseInt(args[++i], 10)
        break
      case "--weight":
        options.weight = parseFloat(args[++i])
        break
      case "--category":
        options.category = args[++i] as "core" | "bonus"
        break
      case "--json":
        options.json = true
        break
    }
  }
  return options
}

export async function runCriteriaUpdate(
  client: OatmealClient,
  hackathonId: string,
  criteriaId: string,
  args: string[]
): Promise<void> {
  if (!criteriaId) {
    console.error("Usage: hackathon judging criteria update <hackathon-id> <criteria-id> [--name ...] [--category ...]")
    process.exit(1)
  }

  const options = parseCriteriaUpdateOptions(args)

  if (options.maxScore !== undefined) {
    console.warn(formatWarning("--max-score is deprecated and has no effect in rubric mode"))
  }

  if (options.weight !== undefined) {
    console.warn(formatWarning("--weight is deprecated and has no effect in rubric mode"))
  }

  if (options.category !== undefined && options.category !== "core" && options.category !== "bonus") {
    console.error("Error: --category must be 'core' or 'bonus'")
    process.exit(1)
  }

  const body: Record<string, unknown> = {}
  if (options.name) body.name = options.name
  if (options.description !== undefined) body.description = options.description
  if (options.category !== undefined) body.category = options.category

  if (Object.keys(body).length === 0) {
    console.error("Error: provide at least one field to update")
    process.exit(1)
  }

  const criteria = await client.patch<JudgingCriteria>(
    `/api/dashboard/hackathons/${hackathonId}/judging/criteria/${criteriaId}`,
    body
  )

  if (options.json) {
    console.log(formatJson(criteria))
    return
  }

  console.log(formatSuccess(`Updated criteria "${criteria.name}"`))
}
