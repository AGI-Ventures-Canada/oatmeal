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
      { key: "judgeName", label: "Judge" },
      { key: "submissionTitle", label: "Submission" },
      { key: "isComplete", label: "Complete" },
      { key: "assignedAt", label: "Assigned At" },
    ])
  )
}
