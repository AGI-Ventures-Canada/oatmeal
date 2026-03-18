import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"
import type { JudgeDisplayProfile } from "../../types.js"

interface JudgeDisplayCreateOptions {
  name?: string
  title?: string
  bio?: string
  json?: boolean
}

export function parseJudgeDisplayCreateOptions(args: string[]): JudgeDisplayCreateOptions {
  const options: JudgeDisplayCreateOptions = {}
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

export async function runJudgeDisplayCreate(
  client: OatmealClient,
  hackathonId: string,
  args: string[]
): Promise<void> {
  const options = parseJudgeDisplayCreateOptions(args)

  let name = options.name

  if (!name && process.stdout.isTTY) {
    const result = await p.text({ message: "Judge name:", validate: (v: string) => (v ? undefined : "Required") })
    if (p.isCancel(result)) return
    name = result
  }

  if (!name) {
    console.error("Error: --name is required")
    process.exit(1)
  }

  const profile = await client.post<JudgeDisplayProfile>(
    `/api/dashboard/hackathons/${hackathonId}/judges/display`,
    { name, title: options.title, bio: options.bio }
  )

  if (options.json) {
    console.log(formatJson(profile))
    return
  }

  console.log(formatSuccess(`Created judge display profile "${profile.name}" (${profile.id})`))
}
