import { listAllAuditLogs } from "@/lib/services/audit"
import { ActivityLog } from "./activity-log"

const PAGE_SIZE = 50

type PageProps = {
  searchParams: Promise<{
    action?: string
    resource_type?: string
    hackathon_id?: string
  }>
}

export default async function AdminActivityPage(props: PageProps) {
  const searchParams = await props.searchParams

  const { logs, total } = await listAllAuditLogs({
    limit: PAGE_SIZE,
    action: searchParams.action,
    resourceType: searchParams.resource_type,
    hackathonId: searchParams.hackathon_id,
  })

  return (
    <ActivityLog
      initialLogs={logs}
      initialTotal={total}
      initialAction={searchParams.action ?? ""}
      initialResourceType={searchParams.resource_type ?? ""}
    />
  )
}
