import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import { getAgentById } from "@/lib/services/agents"
import { listAgentRuns } from "@/lib/services/agent-runs"
import { getOrCreateTenant } from "@/lib/services/tenants"
import { AgentDetail } from "@/components/dashboard/agent-detail"
import { AgentRunList } from "@/components/dashboard/agent-run-list"
import { RunAgentButton } from "@/components/dashboard/run-agent-button"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AutoRefresh } from "@/components/ui/auto-refresh"
import { CopyableId } from "@/components/ui/copyable-id"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ run?: string }>
}

export default async function AgentDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { run } = await searchParams
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

  const agent = await getAgentById(id, tenant.id)
  if (!agent) {
    notFound()
  }

  const runs = await listAgentRuns(tenant.id, { agentId: id, limit: 20 })

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/agents">Agents</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{agent.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{agent.name}</h1>
          <CopyableId id={agent.id} className="text-sm" />
          {agent.description && (
            <p className="text-muted-foreground mt-1">{agent.description}</p>
          )}
        </div>
        <RunAgentButton agentId={agent.id} agentName={agent.name} autoOpen={run === "true"} />
      </div>

      <Tabs defaultValue="runs">
        <TabsList>
          <TabsTrigger value="runs">Run History</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>
        <TabsContent value="runs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Runs</CardTitle>
              <CardDescription>
                View the execution history for this agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgentRunList runs={runs} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="configuration" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Configuration</CardTitle>
              <CardDescription>
                Configure your agent&apos;s behavior and capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgentDetail agent={agent} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
