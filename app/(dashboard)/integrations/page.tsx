import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { listIntegrations } from "@/lib/integrations/oauth"
import { listCredentials } from "@/lib/services/org-credentials"
import { getOrCreateTenant } from "@/lib/services/tenants"
import { IntegrationList } from "@/components/dashboard/integration-list"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AutoRefresh } from "@/components/ui/auto-refresh"

export default async function IntegrationsPage() {
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

  const [integrations, credentials] = await Promise.all([
    listIntegrations(tenant.id),
    listCredentials(tenant.id),
  ])

  const connectedOAuthProviders = new Map(
    integrations.map((i) => [i.provider, i])
  )
  const connectedApiKeyProviders = new Map(
    credentials.map((c) => [c.provider, c])
  )

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">
            Connect external services to use with your agents
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Integrations</CardTitle>
          <CardDescription>
            Connect your accounts to enable agents to access these services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IntegrationList
            connectedOAuthProviders={connectedOAuthProviders}
            connectedApiKeyProviders={connectedApiKeyProviders}
          />
        </CardContent>
      </Card>
    </div>
  )
}
