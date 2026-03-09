import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"
import type { JudgeDisplayProfile } from "../../types.js"

interface JudgeDisplayUpdateOptions {
  name?: string
  title?: string
  bio?: string
  json?: boolean
}

export function parseJudgeDisplayUpdateOptions(args: string[]): JudgeDisplayUpdateOptions {
  const options: JudgeDisplayUpdateOptions = {}
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--name":
        options.name = args[++i]
        break
      case "--title":
        options.title = args[++i]
        break
      case "--bio":
        options.bio = args[++i]
        break
      case "--json":
        options.json = true
        break
    }
  }
  return options
}

export async function runJudgeDisplayUpdate(
  client: OatmealClient,
  hackathonId: string,
  profileId: string,
  args: string[]
): Promise<void> {
  if (!profileId) {
    console.error("Usage: hackathon judge-display update <hackathon-id> <profile-id> [--name ...]")
    process.exit(1)
  }

  const options = parseJudgeDisplayUpdateOptions(args)
  const body: Record<string, unknown> = {}
  if (options.name) body.name = options.name
  if (options.title) body.title = options.title
  if (options.bio) body.bio = options.bio

  if (Object.keys(body).length === 0) {
    console.error("Error: provide at least one field to update")
    process.exit(1)
  }

  const profile = await client.patch<JudgeDisplayProfile>(
    `/api/dashboard/hackathons/${hackathonId}/judges/display/${profileId}`,
    body
  )

  if (options.json) {
    console.log(formatJson(profile))
    return
  }

  console.log(formatSuccess(`Updated judge display profile "${profile.name}"`))
}
