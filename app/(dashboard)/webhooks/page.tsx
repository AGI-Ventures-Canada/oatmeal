import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { listWebhooks } from "@/lib/services/webhooks"
import { getOrCreateTenant } from "@/lib/services/tenants"
import { WebhookList } from "@/components/dashboard/webhook-list"
import { CreateWebhookButton } from "@/components/dashboard/create-webhook-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AutoRefresh } from "@/components/ui/auto-refresh"

export default async function WebhooksPage() {
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

  const webhooks = await listWebhooks(tenant.id)

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground">
            Receive notifications when agent events occur
          </p>
        </div>
        <CreateWebhookButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Webhooks</CardTitle>
          <CardDescription>
            Configure HTTP endpoints to receive event notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WebhookList webhooks={webhooks} />
        </CardContent>
      </Card>
    </div>
  )
}
