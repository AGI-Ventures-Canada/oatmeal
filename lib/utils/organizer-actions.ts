import type { HackathonStatus, HackathonPhase } from "@/lib/db/hackathon-types"

export type ActionSeverity = "urgent" | "warning" | "info"

export type ActionItem = {
  id: string
  label: string
  hint?: string
  severity: ActionSeverity
  tab?: string
  subtab?: string
  subtabKey?: string
}

type ActionItemsInput = {
  status: HackathonStatus
  phase: HackathonPhase | null
  submissionCount: number
  participantCount: number
  teamCount: number
  judgingProgress: { totalAssignments: number; completedAssignments: number }
  judgeCount: number
  prizeCount: number
  judgeDisplayCount: number
  mentorQueue: { open: number }
  challengeReleased: boolean
  resultsPublishedAt: string | null
  winnerEmailsSentAt: string | null
  description: string | null
  bannerUrl: string | null
  startsAt: string | null
  endsAt: string | null
  registrationOpensAt: string | null
  registrationClosesAt: string | null
}

export function getOrganizerActionItems(input: ActionItemsInput): ActionItem[] {
  const items: ActionItem[] = []
  const { status } = input

  if (status === "draft") {
    addDraftActions(items, input)
  } else if (status === "published" || status === "registration_open") {
    addPublishedActions(items, input)
  } else if (status === "active") {
    addActiveActions(items, input)
  } else if (status === "judging") {
    addJudgingActions(items, input)
  } else if (status === "completed") {
    addCompletedActions(items, input)
  }

  return items
}

function addDraftActions(items: ActionItem[], input: ActionItemsInput) {
  if (!input.description) {
    items.push({ id: "no-description", label: "Add an event description", hint: "Helps participants know what to expect", severity: "warning", tab: "edit" })
  }
  if (!input.startsAt || !input.endsAt) {
    items.push({ id: "no-dates", label: "Set event start and end dates", hint: "Required before you can publish", severity: "urgent", tab: "edit" })
  }
  if (!input.registrationOpensAt || !input.registrationClosesAt) {
    items.push({ id: "no-reg-dates", label: "Set registration dates", hint: "Controls when signups open and close", severity: "urgent", tab: "edit" })
  }
  if (input.prizeCount === 0) {
    items.push({ id: "no-prizes", label: "Add prizes", hint: "Define what teams are competing for", severity: "info", tab: "judging" })
  }
  if (input.judgeDisplayCount === 0) {
    items.push({ id: "no-judges", label: "Invite judges", hint: "Judges evaluate submissions after the event", severity: "info", tab: "judging" })
  }
  if (!input.bannerUrl) {
    items.push({ id: "no-banner", label: "Upload a banner image", hint: "Makes your event page stand out", severity: "info", tab: "edit" })
  }
}

function addPublishedActions(items: ActionItem[], input: ActionItemsInput) {
  if (input.participantCount === 0) {
    items.push({ id: "no-registrations", label: "No registrations yet", hint: "Share the event link or invite captains by email", severity: "warning", tab: "teams" })
  }
  if (input.judgeDisplayCount === 0) {
    items.push({ id: "no-judges", label: "No judges invited yet", severity: "warning", tab: "judging" })
  }
  if (input.prizeCount === 0) {
    items.push({ id: "no-prizes", label: "No prizes defined", severity: "info", tab: "judging" })
  }
  if (input.startsAt) {
    const hoursUntilStart = (new Date(input.startsAt).getTime() - Date.now()) / (1000 * 60 * 60)
    if (hoursUntilStart > 0 && hoursUntilStart <= 24) {
      items.push({ id: "starting-soon", label: "Event starts in less than 24 hours", hint: "Double-check everything is ready", severity: "info" })
    }
  }
}

function addActiveActions(items: ActionItem[], input: ActionItemsInput) {
  if (!input.challengeReleased) {
    items.push({ id: "challenge-not-released", label: "Challenge hasn't been released", hint: "Participants can't see what to build yet", severity: "urgent", tab: "event", subtab: "challenge", subtabKey: "etab" })
  }
  if (input.mentorQueue.open > 0) {
    items.push({ id: "mentor-requests", label: `${input.mentorQueue.open} mentor request${input.mentorQueue.open !== 1 ? "s" : ""} pending`, hint: "Review and respond to requests", severity: "warning", tab: "event", subtab: "mentors", subtabKey: "etab" })
  }
  if (input.submissionCount === 0 && input.endsAt) {
    const hoursLeft = (new Date(input.endsAt).getTime() - Date.now()) / (1000 * 60 * 60)
    if (hoursLeft <= 4 && hoursLeft > 0) {
      items.push({ id: "no-submissions-ending", label: "No submissions yet and event ends soon", hint: "Consider sending a deadline reminder", severity: "urgent" })
    }
  }
  if (input.judgeCount === 0) {
    items.push({ id: "no-judges-active", label: "No judges assigned yet", severity: "warning", tab: "judging" })
  }
}

function addJudgingActions(items: ActionItem[], input: ActionItemsInput) {
  const { totalAssignments, completedAssignments } = input.judgingProgress
  if (totalAssignments > 0 && completedAssignments < totalAssignments) {
    const pct = Math.round((completedAssignments / totalAssignments) * 100)
    items.push({ id: "judging-incomplete", label: `Judging ${pct}% complete (${completedAssignments}/${totalAssignments})`, severity: pct < 50 ? "warning" : "info", tab: "judging" })
  }
  if (input.mentorQueue.open > 0) {
    items.push({ id: "mentor-requests", label: `${input.mentorQueue.open} mentor request${input.mentorQueue.open !== 1 ? "s" : ""} still pending`, hint: "Close out remaining requests", severity: "info", tab: "event", subtab: "mentors", subtabKey: "etab" })
  }
}

function addCompletedActions(items: ActionItem[], input: ActionItemsInput) {
  if (!input.resultsPublishedAt) {
    items.push({ id: "results-not-published", label: "Results not yet published", hint: "Review scores and publish", severity: "urgent", tab: "judging" })
  }
  if (input.resultsPublishedAt && !input.winnerEmailsSentAt) {
    items.push({ id: "winner-emails-not-sent", label: "Winner notification emails not sent", hint: "Let winners know they've been selected", severity: "warning" })
  }
}
