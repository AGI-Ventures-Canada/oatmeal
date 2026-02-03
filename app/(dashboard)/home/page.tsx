import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Plus } from "lucide-react"
import { resolvePageTenant } from "@/lib/services/tenants"
import {
  listParticipatingHackathons,
  listOrganizedHackathons,
  listSponsoredHackathons,
} from "@/lib/services/hackathons"
import { Button } from "@/components/ui/button"
import { CreateHackathonDrawer } from "@/components/hackathon/create-hackathon-drawer"
import { HackathonTabs } from "./hackathon-tabs"
import { PageHeader } from "@/components/page-header"

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  const tenant = await resolvePageTenant()

  const [myHackathons, organizedHackathons, sponsoredHackathons] = await Promise.all([
    listParticipatingHackathons(userId),
    listOrganizedHackathons(tenant.id),
    listSponsoredHackathons(tenant.id),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard" }]}
        title="Dashboard"
        description="Your hackathons at a glance"
        actions={
          <CreateHackathonDrawer
            trigger={
              <Button>
                <Plus className="mr-2 size-4" />
                Create Hackathon
              </Button>
            }
          />
        }
      />

      <HackathonTabs
        myHackathons={myHackathons}
        organizedHackathons={organizedHackathons}
        sponsoredHackathons={sponsoredHackathons}
      />
    </div>
  )
}
