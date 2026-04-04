import type { OatmealClient } from "../../client.js"
import { formatJson, formatSuccess } from "../../output.js"
import type { BucketDef } from "../../types.js"

interface BucketsOptions {
  json?: boolean
}

function parseOptions(args: string[]): { buckets: Array<{ level: number; label: string; description?: string }>; options: BucketsOptions } {
  const options: BucketsOptions = {}
  const buckets: Array<{ level: number; label: string; description?: string }> = []
  let currentLabel = ""
  let currentDesc = ""

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--json":
        options.json = true
        break
      case "--bucket": {
        if (currentLabel) {
          buckets.push({ level: buckets.length + 1, label: currentLabel, description: currentDesc || undefined })
        }
        currentLabel = args[++i]
        currentDesc = ""
        break
      }
      case "--bucket-desc":
        currentDesc = args[++i]
        break
    }
  }
  if (currentLabel) {
    buckets.push({ level: buckets.length + 1, label: currentLabel, description: currentDesc || undefined })
  }

  return { buckets, options }
}

export async function runTracksBuckets(
  client: OatmealClient,
  hackathonId: string,
  trackId: string,
  roundId: string,
  args: string[]
): Promise<void> {
  if (!trackId || !roundId) {
    console.error("Usage: hackathon tracks buckets <hackathon-id> <track-id> <round-id> --bucket <label> [--bucket-desc <desc>] ...")
    process.exit(1)
  }

  const { buckets, options } = parseOptions(args)

  if (buckets.length < 2) {
    console.error("Error: at least 2 buckets are required (use --bucket <label> for each)")
    process.exit(1)
  }

  const result = await client.put<{ buckets: BucketDef[] }>(
    `/api/dashboard/hackathons/${hackathonId}/prize-tracks/${trackId}/rounds/${roundId}/buckets`,
    { buckets }
  )

  if (options.json) {
    console.log(formatJson(result))
    return
  }

  console.log(formatSuccess(`Saved ${result.buckets.length} bucket definitions`))
  for (const b of result.buckets) {
    console.log(`  ${b.level}. ${b.label}${b.description ? ` — ${b.description}` : ""}`)
  }
}
