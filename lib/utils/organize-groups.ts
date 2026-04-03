import type { HackathonStatus } from "@/lib/db/hackathon-types"
import type { HackathonMiniStats } from "@/lib/services/organizer-dashboard"

type GroupableHackathon = {
  id: string
  status: HackathonStatus
  starts_at: string | null
  ends_at: string | null
}

export type OrganizerGroup = "active" | "upcoming" | "setup" | "past"

export const GROUP_LABELS: Record<OrganizerGroup, string> = {
  active: "Active Now",
  upcoming: "Upcoming",
  setup: "In Setup",
  past: "Past Events",
}

export const GROUP_ORDER: OrganizerGroup[] = ["active", "upcoming", "setup", "past"]

export function groupOrganizedHackathons<T extends GroupableHackathon>(
  hackathons: T[],
  statsMap: Map<string, HackathonMiniStats>,
): Record<OrganizerGroup, T[]> {
  const groups: Record<OrganizerGroup, T[]> = {
    active: [],
    upcoming: [],
    setup: [],
    past: [],
  }

  const now = new Date()
  for (const h of hackathons) {
    const group = resolveGroup(h.status, h.ends_at, now)
    groups[group].push(h)
  }

  groups.active.sort((a, b) => urgencyScore(b, statsMap) - urgencyScore(a, statsMap))
  groups.upcoming.sort((a, b) => {
    if (!a.starts_at && !b.starts_at) return 0
    if (!a.starts_at) return 1
    if (!b.starts_at) return -1
    return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  })
  groups.past.sort((a, b) => {
    if (!a.ends_at && !b.ends_at) return 0
    if (!a.ends_at) return 1
    if (!b.ends_at) return -1
    return new Date(b.ends_at).getTime() - new Date(a.ends_at).getTime()
  })

  return groups
}

function resolveGroup(status: HackathonStatus, endsAt: string | null, now: Date): OrganizerGroup {
  if (endsAt && new Date(endsAt) < now && status !== "draft") {
    return "past"
  }

  switch (status) {
    case "active":
    case "judging":
      return "active"
    case "published":
    case "registration_open":
      return "upcoming"
    case "draft":
      return "setup"
    case "completed":
    case "archived":
      return "past"
    default:
      return "setup"
  }
}

function urgencyScore(h: GroupableHackathon, statsMap: Map<string, HackathonMiniStats>): number {
  const stats = statsMap.get(h.id)
  if (!stats) return 0

  let score = 0
  if (stats.openMentorRequests > 0) score += 10
  if (stats.judgingTotal > 0 && stats.judgingComplete < stats.judgingTotal) score += 5
  if (h.status === "judging") score += 3
  return score
}

export function hasUrgencySignals(hackathonId: string, statsMap: Map<string, HackathonMiniStats>): boolean {
  const stats = statsMap.get(hackathonId)
  if (!stats) return false
  return stats.openMentorRequests > 0 || (stats.judgingTotal > 0 && stats.judgingComplete < stats.judgingTotal)
}
