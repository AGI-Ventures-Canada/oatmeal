import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { listSchedules } from "@/lib/services/schedules"
import { getOrCreateTenant } from "@/lib/services/tenants"
import { ScheduleList } from "@/components/dashboard/schedule-list"
import { CreateScheduleButton } from "@/components/dashboard/create-schedule-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AutoRefresh } from "@/components/ui/auto-refresh"

export default async function SchedulesPage() {
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

  const schedules = await listSchedules(tenant.id)

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Schedules</h1>
          <p className="text-muted-foreground">
            Schedule jobs to run automatically at specific intervals
          </p>
        </div>
        <CreateScheduleButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Schedules</CardTitle>
          <CardDescription>
            Configure when your jobs should run automatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScheduleList schedules={schedules} />
        </CardContent>
      </Card>
    </div>
  )
}
