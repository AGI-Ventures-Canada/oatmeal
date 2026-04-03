import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { listJudgingHackathons } from "@/lib/services/hackathons"
import { getBatchJudgeStats } from "@/lib/services/persona-stats"
import { JudgingDashboard } from "./judging-dashboard"

export default async function JudgingPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const hackathons = await listJudgingHackathons(userId)
  const judgeStats = await getBatchJudgeStats(
    hackathons.map((h) => h.id),
    userId,
  )
  const serializedStats = Object.fromEntries(judgeStats)

  return (
    <JudgingDashboard
      hackathons={hackathons}
      judgeStats={serializedStats}
    />
  )
}
