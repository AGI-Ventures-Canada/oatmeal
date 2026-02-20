import { listSchedules } from "@/lib/services/schedules"
import { resolvePageTenant } from "@/lib/services/tenants"
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

export default async function SettingsSchedulesPage() {
  const tenant = await resolvePageTenant()

  const schedules = await listSchedules(tenant.id)

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
