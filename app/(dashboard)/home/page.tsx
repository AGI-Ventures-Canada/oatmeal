import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { resolvePageTenant } from "@/lib/services/tenants"
import {
  listParticipatingHackathons,
  listOrganizedHackathons,
  listSponsoredHackathons,
} from "@/lib/services/hackathons"
import { getSubmittedHackathonIds } from "@/lib/services/submissions"
import { HackathonTabs } from "./hackathon-tabs"
import { PageHeader } from "@/components/page-header"

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  const tenant = await resolvePageTenant()

  const [myHackathons, organizedHackathons, sponsoredHackathons, submittedHackathonIds] = await Promise.all([
    listParticipatingHackathons(userId),
    listOrganizedHackathons(tenant.id),
    listSponsoredHackathons(tenant.id),
    getSubmittedHackathonIds(userId),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard" }]}
        title="Dashboard"
        description="Your hackathons at a glance"
      />

      <HackathonTabs
        myHackathons={myHackathons}
        organizedHackathons={organizedHackathons}
        sponsoredHackathons={sponsoredHackathons}
        submittedHackathonIds={Array.from(submittedHackathonIds)}
      />
    </div>
  )
}
