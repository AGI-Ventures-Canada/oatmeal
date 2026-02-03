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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Your hackathons at a glance
          </p>
        </div>
        <CreateHackathonDrawer
          trigger={
            <Button>
              <Plus className="mr-2 size-4" />
              Create Hackathon
            </Button>
          }
        />
      </div>

      <HackathonTabs
        myHackathons={myHackathons}
        organizedHackathons={organizedHackathons}
        sponsoredHackathons={sponsoredHackathons}
      />
    </div>
  )
}
