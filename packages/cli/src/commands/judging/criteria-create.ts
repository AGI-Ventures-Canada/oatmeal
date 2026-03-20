import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess, formatWarning } from "../../output.js"
import type { JudgingCriteria } from "../../types.js"

interface CriteriaCreateOptions {
  name?: string
  description?: string
  maxScore?: number
  weight?: number
  category?: "core" | "bonus"
  json?: boolean
}

export function parseCriteriaCreateOptions(args: string[]): CriteriaCreateOptions {
  const options: CriteriaCreateOptions = {}
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

export async function runCriteriaCreate(
  client: OatmealClient,
  hackathonId: string,
  args: string[]
): Promise<void> {
  const options = parseCriteriaCreateOptions(args)

  if (options.maxScore !== undefined) {
    console.warn(formatWarning("--max-score is deprecated and has no effect in rubric mode"))
  }

  if (options.weight !== undefined) {
    console.warn(formatWarning("--weight is deprecated and has no effect in rubric mode"))
  }

  let name = options.name

  if (!name && process.stdout.isTTY) {
    const result = await p.text({ message: "Criteria name:", validate: (v: string) => (v ? undefined : "Required") })
    if (p.isCancel(result)) return
    name = result
  }

  if (!name) {
    console.error("Error: --name is required")
    process.exit(1)
  }

  const category = options.category ?? "core"

  if (category !== "core" && category !== "bonus") {
    console.error("Error: --category must be 'core' or 'bonus'")
    process.exit(1)
  }

  const criteria = await client.post<JudgingCriteria>(
    `/api/dashboard/hackathons/${hackathonId}/judging/criteria`,
    {
      name,
      description: options.description,
      category,
    }
  )

  if (options.json) {
    console.log(formatJson(criteria))
    return
  }

  console.log(formatSuccess(`Created criteria "${criteria.name}" (${criteria.id})`))
}
