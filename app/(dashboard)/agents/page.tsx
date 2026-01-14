import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { listAgents } from "@/lib/services/agents"
import { getOrCreateTenant } from "@/lib/services/tenants"
import { AgentList } from "@/components/dashboard/agent-list"
import { CreateAgentButton } from "@/components/dashboard/create-agent-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AutoRefresh } from "@/components/ui/auto-refresh"

export default async function AgentsPage() {
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

  const agents = await listAgents(tenant.id, { limit: 50 })

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agents</h1>
          <p className="text-muted-foreground">Create and manage your AI agents</p>
        </div>
        <CreateAgentButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Agents</CardTitle>
          <CardDescription>
            Agents can be triggered manually, via API, on schedules, or through events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AgentList agents={agents} />
        </CardContent>
      </Card>
    </div>
  )
}
