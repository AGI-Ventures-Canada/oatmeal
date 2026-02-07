import type { HackathonStatus } from "@/lib/db/hackathon-types"

export interface TimelineState {
  label: string
  variant: "default" | "secondary" | "outline"
}

export interface TimelineInput {
  status: HackathonStatus
  registration_opens_at?: string | null
  registration_closes_at?: string | null
  starts_at?: string | null
  ends_at?: string | null
}

export function getTimelineState(hackathon: TimelineInput): TimelineState {
  const now = new Date()
  const {
    status,
    registration_opens_at,
    registration_closes_at,
    starts_at,
    ends_at,
  } = hackathon

  if (status === "completed") {
    return { label: "Completed", variant: "outline" }
  }

  if (status === "judging") {
    return { label: "Judging", variant: "default" }
  }

  if (status === "active") {
    return { label: "Live", variant: "default" }
  }

  if (status === "draft") {
    return { label: "Draft", variant: "secondary" }
  }

  if (status === "archived") {
    return { label: "Archived", variant: "outline" }
  }

  const opensAt = registration_opens_at ? new Date(registration_opens_at) : null
  const closesAt = registration_closes_at
    ? new Date(registration_closes_at)
    : null
  const startsAt = starts_at ? new Date(starts_at) : null
  const endsAt = ends_at ? new Date(ends_at) : null

  if (opensAt && closesAt) {
    if (now < opensAt) {
      return { label: "Coming Soon", variant: "secondary" }
    }
    if (now >= opensAt && now <= closesAt) {
      return { label: "Registration Open", variant: "default" }
    }
    if (now > closesAt && startsAt && now < startsAt) {
      return { label: "Registration Closed", variant: "secondary" }
    }
    if (startsAt && endsAt && now >= startsAt && now <= endsAt) {
      return { label: "Live", variant: "default" }
    }
    if (endsAt && now > endsAt) {
      return { label: "Completed", variant: "outline" }
    }
  }

  if (status === "registration_open") {
    return { label: "Registration Open", variant: "default" }
  }

  return { label: "Coming Soon", variant: "secondary" }
}
