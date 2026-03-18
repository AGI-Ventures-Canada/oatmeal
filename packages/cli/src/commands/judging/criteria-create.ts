import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"
import type { JudgingCriteria } from "../../types.js"

interface CriteriaCreateOptions {
  name?: string
  description?: string
  maxScore?: number
  weight?: number
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

  let name = options.name
  let maxScore = options.maxScore
  let weight = options.weight

  if (!name && process.stdout.isTTY) {
    const result = await p.text({ message: "Criteria name:", validate: (v: string) => (v ? undefined : "Required") })
    if (p.isCancel(result)) return
    name = result
  }

  if (!name) {
    console.error("Error: --name is required")
    process.exit(1)
  }

  if (maxScore === undefined && process.stdout.isTTY) {
    const result = await p.text({ message: "Max score:", initialValue: "10" })
    if (p.isCancel(result)) return
    maxScore = parseInt(result, 10)
  }

  if (maxScore !== undefined && (isNaN(maxScore) || maxScore <= 0)) {
    console.error("Error: --max-score must be a positive integer")
    process.exit(1)
  }

  if (weight === undefined && process.stdout.isTTY) {
    const result = await p.text({ message: "Weight:", initialValue: "1" })
    if (p.isCancel(result)) return
    weight = parseFloat(result)
  }

  const criteria = await client.post<JudgingCriteria>(
    `/api/dashboard/hackathons/${hackathonId}/judging/criteria`,
    {
      name,
      description: options.description,
      max_score: maxScore ?? 10,
      weight: weight ?? 1,
    }
  )

  if (options.json) {
    console.log(formatJson(criteria))
    return
  }

  console.log(formatSuccess(`Created criteria "${criteria.name}" (${criteria.id})`))
}
