import { auth } from "@clerk/nextjs/server"
import { notFound, redirect } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { JobStatusBadge } from "@/components/dashboard/job-status-badge"
import { getJobById } from "@/lib/services/jobs"
import { getOrCreateTenant } from "@/lib/services/tenants"
import { formatDateTime } from "@/lib/utils/format"
import type { JobDetail } from "@/lib/types/dashboard"

export default async function JobDetailPage(props: {
  params: Promise<{ id: string }>
}) {
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

  const { id } = await props.params
  const jobData = await getJobById(id, tenant.id)

  if (!jobData) {
    notFound()
  }

  const job: JobDetail = {
    id: jobData.id,
    type: jobData.type,
    status: jobData.status_cache,
    input: jobData.input,
    result: jobData.result,
    error: jobData.error,
    createdAt: jobData.created_at,
    updatedAt: jobData.updated_at,
    completedAt: jobData.completed_at,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Job Details</h1>
        <p className="text-muted-foreground font-mono">{job.id}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium">{job.type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <JobStatusBadge status={job.status} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{formatDateTime(job.createdAt)}</p>
            </div>
            {job.completedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="font-medium">{formatDateTime(job.completedAt)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 overflow-auto text-sm">
              {JSON.stringify(job.input, null, 2)}
            </pre>
          </CardContent>
        </Card>

        {job.result !== null && job.result !== undefined && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 overflow-auto text-sm">
                {JSON.stringify(job.result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {job.error !== null && job.error !== undefined && (
          <Card className="md:col-span-2 border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-destructive/10 text-destructive p-4 overflow-auto text-sm">
                {JSON.stringify(job.error, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
