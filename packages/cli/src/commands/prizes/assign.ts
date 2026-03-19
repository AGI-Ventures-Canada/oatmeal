import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"

interface AssignOptions {
  submission?: string
  json?: boolean
}

export function parseAssignOptions(args: string[]): AssignOptions {
  const options: AssignOptions = {}
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--submission":
        options.submission = args[++i]
        break
      case "--json":
        options.json = true
        break
    }
  }
  return options
}

export async function runPrizesAssign(
  client: OatmealClient,
  hackathonId: string,
  prizeId: string,
  args: string[]
): Promise<void> {
  if (!prizeId) {
    console.error("Usage: hackathon prizes assign <hackathon-id> <prize-id> --submission <id>")
    process.exit(1)
  }

  const options = parseAssignOptions(args)

  if (!options.submission) {
    console.error("Error: --submission is required")
    process.exit(1)
  }

  const result = await client.post(
    `/api/dashboard/hackathons/${hackathonId}/prizes/${prizeId}/assign`,
    { submissionId: options.submission }
  )

  if (options.json) {
    console.log(formatJson(result))
    return
  }

  console.log(formatSuccess(`Assigned prize ${prizeId} to submission ${options.submission}`))
}
