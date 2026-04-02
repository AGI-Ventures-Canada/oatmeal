import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { resolvePageTenant } from "@/lib/services/tenants"
import {
  listParticipatingHackathons,
  listOrganizedHackathons,
  listSponsoredHackathons,
  listJudgingHackathons,
} from "@/lib/services/hackathons"
import { getSubmittedHackathonIds } from "@/lib/services/submissions"
import { getBatchHackathonStats } from "@/lib/services/organizer-dashboard"
import { HackathonTabs } from "./hackathon-tabs"
import { PageHeader } from "@/components/page-header"

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  const tenant = await resolvePageTenant()

  const [myHackathons, organizedHackathons, sponsoredHackathons, judgingHackathons, submittedHackathonIds] = await Promise.all([
    listParticipatingHackathons(userId),
    listOrganizedHackathons(tenant.id),
    listSponsoredHackathons(tenant.id),
    listJudgingHackathons(userId),
    getSubmittedHackathonIds(userId),
  ])

  const organizedStats = await getBatchHackathonStats(organizedHackathons.map((h) => h.id))

  const serializedStats = Object.fromEntries(organizedStats)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your hackathons at a glance"
      />

      <HackathonTabs
        myHackathons={myHackathons}
        organizedHackathons={organizedHackathons}
        sponsoredHackathons={sponsoredHackathons}
        judgingHackathons={judgingHackathons}
        submittedHackathonIds={Array.from(submittedHackathonIds)}
        organizedStats={serializedStats}
      />
    </div>
  )
}
