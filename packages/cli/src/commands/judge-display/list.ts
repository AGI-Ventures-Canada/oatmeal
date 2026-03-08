import type { OatmealClient } from "../../client.js"
import { formatJson, formatTable } from "../../output.js"
import type { JudgeDisplayProfile } from "../../types.js"

export async function runJudgeDisplayList(
  client: OatmealClient,
  hackathonId: string,
  options: { json?: boolean }
): Promise<void> {
  const data = await client.get<{ profiles: JudgeDisplayProfile[] }>(
    `/api/dashboard/hackathons/${hackathonId}/judges/display`
  )

  if (options.json) {
    console.log(formatJson(data))
    return
  }

  if (!data.profiles?.length) {
    console.log("No judge display profiles found.")
    return
  }

  console.log(
    formatTable(data.profiles, [
      { key: "name", label: "Name" },
      { key: "title", label: "Title" },
      { key: "bio", label: "Bio" },
    ])
  )
}
