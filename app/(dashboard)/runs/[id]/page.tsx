import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { getAgentRunById, listAgentRunSteps } from "@/lib/services/agent-runs"
import { getAgentById } from "@/lib/services/agents"
import { getOrCreateTenant } from "@/lib/services/tenants"
import { RunDetail } from "@/components/dashboard/run-detail"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RunDetailPage({ params }: PageProps) {
  const { id } = await params
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

  const run = await getAgentRunById(id, tenant.id)
  if (!run) {
    notFound()
  }

  const agent = await getAgentById(run.agent_id, tenant.id)
  const steps = await listAgentRunSteps(id, tenant.id)

  return (
    <div className="space-y-6 min-w-0 w-full max-w-full overflow-hidden">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={agent ? `/agents/${agent.id}` : "/agents"}>
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Run Details</h1>
          <p className="text-muted-foreground font-mono text-sm">
            {run.id}
          </p>
        </div>
      </div>

      <Card className="overflow-hidden w-full min-w-0">
        <CardHeader>
          <CardTitle>
            {agent?.name || "Unknown Agent"}
          </CardTitle>
          <CardDescription>
            Started {new Date(run.created_at).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden min-w-0">
          <RunDetail run={run} steps={steps} />
        </CardContent>
      </Card>
    </div>
  )
}
