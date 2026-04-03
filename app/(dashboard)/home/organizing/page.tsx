import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { resolvePageTenant } from "@/lib/services/tenants"
import { listOrganizedHackathons } from "@/lib/services/hackathons"
import { getBatchHackathonStats } from "@/lib/services/organizer-dashboard"
import { OrganizingDashboard } from "./organizing-dashboard"

export default async function OrganizingPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const tenant = await resolvePageTenant()
  const hackathons = await listOrganizedHackathons(tenant.id)
  const stats = await getBatchHackathonStats(hackathons.map((h) => h.id))
  const serializedStats = Object.fromEntries(stats)

  return (
    <OrganizingDashboard
      hackathons={hackathons}
      stats={serializedStats}
    />
  )
}
