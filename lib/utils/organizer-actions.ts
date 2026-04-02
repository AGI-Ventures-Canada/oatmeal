import type { HackathonStatus, HackathonPhase } from "@/lib/db/hackathon-types"

export type ActionSeverity = "urgent" | "warning" | "info"

export type ActionItem = {
  id: string
  label: string
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
  judgingSetupStatus: { judgeCount: number; hasUnassignedSubmissions: boolean }
  criteriaCount: number
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
    items.push({ id: "no-description", label: "Add an event description", severity: "warning", tab: "edit" })
  }
  if (!input.startsAt || !input.endsAt) {
    items.push({ id: "no-dates", label: "Set event start and end dates", severity: "urgent", tab: "edit" })
  }
  if (!input.registrationOpensAt || !input.registrationClosesAt) {
    items.push({ id: "no-reg-dates", label: "Set registration dates", severity: "urgent", tab: "edit" })
  }
  if (input.criteriaCount === 0) {
    items.push({ id: "no-criteria", label: "Define judging criteria", severity: "warning", tab: "judges", subtab: "criteria", subtabKey: "jtab" })
  }
  if (input.prizeCount === 0) {
    items.push({ id: "no-prizes", label: "Add prizes", severity: "info", tab: "prizes" })
  }
  if (input.judgeDisplayCount === 0) {
    items.push({ id: "no-judges", label: "Invite judges", severity: "info", tab: "judges", subtab: "assignments", subtabKey: "jtab" })
  }
  if (!input.bannerUrl) {
    items.push({ id: "no-banner", label: "Upload a banner image", severity: "info", tab: "edit" })
  }
}

function addPublishedActions(items: ActionItem[], input: ActionItemsInput) {
  if (input.participantCount === 0) {
    items.push({ id: "no-registrations", label: "No registrations yet", severity: "warning" })
  }
  if (input.criteriaCount === 0) {
    items.push({ id: "no-criteria", label: "Define judging criteria before event starts", severity: "urgent", tab: "judges", subtab: "criteria", subtabKey: "jtab" })
  }
  if (input.judgeDisplayCount === 0) {
    items.push({ id: "no-judges", label: "No judges invited yet", severity: "warning", tab: "judges", subtab: "assignments", subtabKey: "jtab" })
  }
  if (input.prizeCount === 0) {
    items.push({ id: "no-prizes", label: "No prizes defined", severity: "info", tab: "prizes" })
  }
  if (input.startsAt) {
    const hoursUntilStart = (new Date(input.startsAt).getTime() - Date.now()) / (1000 * 60 * 60)
    if (hoursUntilStart > 0 && hoursUntilStart <= 24) {
      items.push({ id: "starting-soon", label: "Event starts in less than 24 hours", severity: "info" })
    }
  }
}

function addActiveActions(items: ActionItem[], input: ActionItemsInput) {
  if (!input.challengeReleased) {
    items.push({ id: "challenge-not-released", label: "Challenge hasn't been released", severity: "urgent", tab: "event", subtab: "challenge", subtabKey: "etab" })
  }
  if (input.mentorQueue.open > 0) {
    items.push({ id: "mentor-requests", label: `${input.mentorQueue.open} mentor request${input.mentorQueue.open !== 1 ? "s" : ""} pending`, severity: "warning", tab: "event", subtab: "mentors", subtabKey: "etab" })
  }
  if (input.submissionCount === 0 && input.endsAt) {
    const hoursLeft = (new Date(input.endsAt).getTime() - Date.now()) / (1000 * 60 * 60)
    if (hoursLeft <= 4 && hoursLeft > 0) {
      items.push({ id: "no-submissions-ending", label: "No submissions yet and event ends soon", severity: "urgent" })
    }
  }
  if (input.criteriaCount === 0) {
    items.push({ id: "no-criteria", label: "Judging criteria not set up", severity: "urgent", tab: "judges", subtab: "criteria", subtabKey: "jtab" })
  }
  if (input.judgingSetupStatus.judgeCount === 0) {
    items.push({ id: "no-judges-active", label: "No judges assigned yet", severity: "warning", tab: "judges", subtab: "assignments", subtabKey: "jtab" })
  }
}

function addJudgingActions(items: ActionItem[], input: ActionItemsInput) {
  if (input.judgingSetupStatus.hasUnassignedSubmissions) {
    items.push({ id: "unassigned-submissions", label: "Some submissions need judge assignments", severity: "urgent", tab: "judges", subtab: "assignments", subtabKey: "jtab" })
  }
  const { totalAssignments, completedAssignments } = input.judgingProgress
  if (totalAssignments > 0 && completedAssignments < totalAssignments) {
    const pct = Math.round((completedAssignments / totalAssignments) * 100)
    items.push({ id: "judging-incomplete", label: `Judging ${pct}% complete (${completedAssignments}/${totalAssignments})`, severity: pct < 50 ? "warning" : "info", tab: "judges", subtab: "progress", subtabKey: "jtab" })
  }
  if (input.mentorQueue.open > 0) {
    items.push({ id: "mentor-requests", label: `${input.mentorQueue.open} mentor request${input.mentorQueue.open !== 1 ? "s" : ""} still pending`, severity: "info", tab: "event", subtab: "mentors", subtabKey: "etab" })
  }
}

function addCompletedActions(items: ActionItem[], input: ActionItemsInput) {
  if (!input.resultsPublishedAt) {
    items.push({ id: "results-not-published", label: "Results not yet published", severity: "urgent", tab: "prizes", subtab: "results", subtabKey: "ptab" })
  }
  if (input.resultsPublishedAt && !input.winnerEmailsSentAt) {
    items.push({ id: "winner-emails-not-sent", label: "Winner notification emails not sent", severity: "warning" })
  }
}
