import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { AllRunsList } from "@/components/dashboard/all-runs-list"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { listAgentRunsWithAgents } from "@/lib/services/agent-runs"
import { getOrCreateTenant } from "@/lib/services/tenants"
import { AutoRefresh } from "@/components/ui/auto-refresh"

export default async function RunsPage() {
  const { userId, orgId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  if (!orgId) {
    redirect("/onboarding")
  }

  const tenant = await getOrCreateTenant(orgId)
  if (!tenant) {
    throw new Error("Failed to get or create tenant")
  }

  const runs = await listAgentRunsWithAgents(tenant.id, { limit: 50 })

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <div>
        <h1 className="text-3xl font-bold">Runs</h1>
        <p className="text-muted-foreground">View all agent run history</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
          <CardDescription>All agent executions across your workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <AllRunsList runs={runs} />
        </CardContent>
      </Card>
    </div>
  )
}
