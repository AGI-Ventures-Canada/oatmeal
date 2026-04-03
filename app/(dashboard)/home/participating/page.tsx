import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { listParticipatingHackathons } from "@/lib/services/hackathons"
import { getSubmittedHackathonIds } from "@/lib/services/submissions"
import { ParticipatingDashboard } from "./participating-dashboard"

export default async function ParticipatingPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const [hackathons, submittedIds] = await Promise.all([
    listParticipatingHackathons(userId),
    getSubmittedHackathonIds(userId),
  ])

  return (
    <ParticipatingDashboard
      hackathons={hackathons}
      submittedHackathonIds={Array.from(submittedIds)}
    />
  )
}
