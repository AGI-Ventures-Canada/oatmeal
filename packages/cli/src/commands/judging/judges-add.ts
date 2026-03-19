import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"
import type { Judge } from "../../types.js"

interface JudgesAddOptions {
  email?: string
  userId?: string
  json?: boolean
}

export function parseJudgesAddOptions(args: string[]): JudgesAddOptions {
  const options: JudgesAddOptions = {}
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--email":
        options.email = args[++i]
        break
      case "--user-id":
        options.userId = args[++i]
        break
      case "--json":
        options.json = true
        break
    }
  }
  return options
}

export async function runJudgesAdd(
  client: OatmealClient,
  hackathonId: string,
  args: string[]
): Promise<void> {
  const options = parseJudgesAddOptions(args)

  if (!options.email && !options.userId) {
    console.error("Error: provide --email or --user-id")
    process.exit(1)
  }

  const body: Record<string, string> = {}
  if (options.email) body.email = options.email
  if (options.userId) body.clerkUserId = options.userId

  const judge = await client.post<Judge>(
    `/api/dashboard/hackathons/${hackathonId}/judging/judges`,
    body
  )

  if (options.json) {
    console.log(formatJson(judge))
    return
  }

  console.log(formatSuccess(`Added judge ${judge.name ?? judge.email ?? judge.id}`))
}
