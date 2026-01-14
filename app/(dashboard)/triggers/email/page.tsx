import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { listEmailAddresses } from "@/lib/services/triggers"
import { listAgents } from "@/lib/services/agents"
import { getOrCreateTenant } from "@/lib/services/tenants"
import { EmailAddressList } from "@/components/dashboard/email-address-list"
import { CreateEmailAddressButton } from "@/components/dashboard/create-email-address-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AutoRefresh } from "@/components/ui/auto-refresh"

export default async function EmailTriggersPage() {
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

  const [emailAddresses, agents] = await Promise.all([
    listEmailAddresses(tenant.id),
    listAgents(tenant.id, { activeOnly: true }),
  ])

  const agentMap = new Map(agents.map((a) => [a.id, a.name]))

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Triggers</h1>
          <p className="text-muted-foreground">
            Create inbound email addresses that trigger agents
          </p>
        </div>
        <CreateEmailAddressButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Addresses</CardTitle>
          <CardDescription>
            Inbound emails to these addresses will trigger the linked agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailAddressList emailAddresses={emailAddresses} agentMap={agentMap} />
        </CardContent>
      </Card>
    </div>
  )
}
