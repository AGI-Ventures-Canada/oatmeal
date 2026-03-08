import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"

interface AutoAssignOptions {
  perJudge?: number
  json?: boolean
}

export function parseAutoAssignOptions(args: string[]): AutoAssignOptions {
  const options: AutoAssignOptions = {}
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--per-judge":
        options.perJudge = parseInt(args[++i], 10)
        break
      case "--json":
        options.json = true
        break
    }
  }
  return options
}

export async function runAutoAssign(
  client: OatmealClient,
  hackathonId: string,
  args: string[]
): Promise<void> {
  const options = parseAutoAssignOptions(args)

  if (!options.perJudge) {
    console.error("Error: --per-judge is required")
    process.exit(1)
  }

  const result = await client.post<{ created: number }>(
    `/api/dashboard/hackathons/${hackathonId}/judging/auto-assign`,
    { per_judge: options.perJudge }
  )

  if (options.json) {
    console.log(formatJson(result))
    return
  }

  console.log(formatSuccess(`Created ${result.created} assignments`))
}
