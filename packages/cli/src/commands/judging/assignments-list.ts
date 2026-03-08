import type { OatmealClient } from "../../client.js"
import { formatJson, formatTable } from "../../output.js"
import type { JudgeAssignment } from "../../types.js"

export async function runAssignmentsList(
  client: OatmealClient,
  hackathonId: string,
  options: { json?: boolean }
): Promise<void> {
  const data = await client.get<{ assignments: JudgeAssignment[] }>(
    `/api/dashboard/hackathons/${hackathonId}/judging/assignments`
  )

  if (options.json) {
    console.log(formatJson(data))
    return
  }

  if (!data.assignments?.length) {
    console.log("No assignments found.")
    return
  }

  console.log(
    formatTable(data.assignments, [
      { key: "judge_name", label: "Judge" },
      { key: "submission_name", label: "Submission" },
      { key: "status", label: "Status" },
      { key: "scored_at", label: "Scored At" },
    ])
  )
}
