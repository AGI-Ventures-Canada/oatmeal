import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { getAgentRunById, listAgentRunSteps } from "@/lib/services/agent-runs"
import { getAgentById } from "@/lib/services/agents"
import { getOrCreateTenant } from "@/lib/services/tenants"
import { RunDetail } from "@/components/dashboard/run-detail"
import { CopyableId } from "@/components/ui/copyable-id"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AutoRefresh } from "@/components/ui/auto-refresh"

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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    const hours = String(d.getHours()).padStart(2, "0")
    const minutes = String(d.getMinutes()).padStart(2, "0")
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  return (
    <div className="space-y-6 min-w-0 w-full max-w-full overflow-hidden">
      <AutoRefresh />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/agents">Agents</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {agent && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/agents/${agent.id}`}>{agent.name}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage>Run {run.id.slice(0, 8)}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold">Run Details</h1>
        <CopyableId id={run.id} className="text-sm" />
      </div>

      <Card className="overflow-hidden w-full min-w-0">
        <CardHeader>
          <CardTitle>
            {agent?.name || "Unknown Agent"}
          </CardTitle>
          <CardDescription>
            Started {formatDate(run.created_at)}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden min-w-0">
          <RunDetail run={run} steps={steps} />
        </CardContent>
      </Card>
    </div>
  )
}
