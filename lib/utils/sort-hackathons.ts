import { getTimelineState } from "@/lib/utils/timeline"
import type { TimelineInput } from "@/lib/utils/timeline"

const STATUS_PRIORITY: Record<string, number> = {
  "Live": 1,
  "Judging": 2,
  "Registration Open": 3,
  "Registration Closed": 4,
  "Coming Soon": 5,
  "Draft": 6,
  "Completed": 7,
  "Archived": 8,
}

export function sortByStatusPriority<T extends TimelineInput & { starts_at: string | null }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    const stateA = getTimelineState(a)
    const stateB = getTimelineState(b)

    const priorityA = STATUS_PRIORITY[stateA.label] ?? 99
    const priorityB = STATUS_PRIORITY[stateB.label] ?? 99

    if (priorityA !== priorityB) return priorityA - priorityB

    if (!a.starts_at && !b.starts_at) return 0
    if (!a.starts_at) return 1
    if (!b.starts_at) return -1
    return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  })
}
