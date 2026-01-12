import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { JobList } from "@/components/dashboard/job-list"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { listJobs } from "@/lib/services/jobs"
import { getOrCreateTenant } from "@/lib/services/tenants"
import type { JobListItem } from "@/lib/types/dashboard"

export default async function JobsPage() {
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

  const jobsData = await listJobs(tenant.id, { limit: 50 })

  const jobs: JobListItem[] = jobsData.map((j) => ({
    id: j.id,
    type: j.type,
    status: j.status_cache,
    createdAt: j.created_at,
    updatedAt: j.updated_at,
    completedAt: j.completed_at,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Jobs</h1>
        <p className="text-muted-foreground">View and monitor your agent jobs</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
          <CardDescription>Jobs submitted via the API</CardDescription>
        </CardHeader>
        <CardContent>
          <JobList jobs={jobs} />
        </CardContent>
      </Card>
    </div>
  )
}
