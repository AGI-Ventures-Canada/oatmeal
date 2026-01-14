import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { listLumaWebhookConfigs } from "@/lib/services/triggers"
import { listAgents } from "@/lib/services/agents"
import { getOrCreateTenant } from "@/lib/services/tenants"
import { LumaWebhookList } from "@/components/dashboard/luma-webhook-list"
import { CreateLumaWebhookButton } from "@/components/dashboard/create-luma-webhook-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AutoRefresh } from "@/components/ui/auto-refresh"

export default async function LumaTriggersPage() {
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

  const [webhookConfigs, agents] = await Promise.all([
    listLumaWebhookConfigs(tenant.id),
    listAgents(tenant.id, { activeOnly: true }),
  ])

  const agentMap = new Map(agents.map((a) => [a.id, a.name]))

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Luma Triggers</h1>
          <p className="text-muted-foreground">
            Trigger agents from Luma calendar events
          </p>
        </div>
        <CreateLumaWebhookButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Luma Webhooks</CardTitle>
          <CardDescription>
            Configure webhooks to receive Luma event notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LumaWebhookList webhookConfigs={webhookConfigs} agentMap={agentMap} />
        </CardContent>
      </Card>
    </div>
  )
}
