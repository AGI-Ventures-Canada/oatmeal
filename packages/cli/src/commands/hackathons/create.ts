import * as p from "@clack/prompts"
import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"
import type { Hackathon } from "../../types.js"

interface CreateOptions {
  name?: string
  slug?: string
  description?: string
  json?: boolean
}

export function parseCreateOptions(args: string[]): CreateOptions {
  const options: CreateOptions = {}
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--name":
        options.name = args[++i]
        break
      case "--slug":
        options.slug = args[++i]
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

export async function runHackathonsCreate(
  client: OatmealClient,
  args: string[]
): Promise<void> {
  const options = parseCreateOptions(args)

  let name = options.name
  let slug = options.slug
  let description = options.description

  if (!name && process.stdout.isTTY) {
    const result = await p.text({ message: "Hackathon name:", validate: (v: string) => (v ? undefined : "Name is required") })
    if (p.isCancel(result)) return
    name = result
  }

  if (!name) {
    console.error("Error: --name is required")
    process.exit(1)
  }

  if (!slug && process.stdout.isTTY) {
    const suggested = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    const result = await p.text({ message: "Slug:", initialValue: suggested })
    if (p.isCancel(result)) return
    slug = result
  }

  if (!description && process.stdout.isTTY) {
    const result = await p.text({ message: "Description (optional):" })
    if (!p.isCancel(result)) description = result || undefined
  }

  const hackathon = await client.post<Hackathon>("/api/dashboard/hackathons", {
    name,
    slug,
    description,
  })

  if (options.json) {
    console.log(formatJson(hackathon))
    return
  }

  console.log(formatSuccess(`Created hackathon "${hackathon.name}" (${hackathon.id})`))
}
