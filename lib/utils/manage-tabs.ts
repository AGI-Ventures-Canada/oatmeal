export const VALID_TABS = ["overview", "edit", "teams", "rooms", "submissions", "judges", "prizes", "event", "activity"] as const
export const VALID_JTABS = ["criteria", "assignments", "progress"] as const
export const VALID_PTABS = ["prizes", "results", "fulfillment"] as const
export const VALID_ETABS = ["challenge", "announcements", "schedule", "mentors", "social", "email"] as const

export type ManageTab = (typeof VALID_TABS)[number]
export type ManageJtab = (typeof VALID_JTABS)[number]
export type ManagePtab = (typeof VALID_PTABS)[number]
export type ManageEtab = (typeof VALID_ETABS)[number]

export const DEFAULT_TAB: ManageTab = "overview"

export function resolveTab(tab: string | undefined, validTabs: readonly string[], fallback: string): string {
  return tab && validTabs.includes(tab) ? tab : fallback
}

export function getJudgingRedirectUrl(slug: string, tab: string | undefined): string {
  if (tab === "prizes") return `/e/${slug}/manage?tab=prizes`
  if (tab && (VALID_JTABS as readonly string[]).includes(tab)) {
    return `/e/${slug}/manage?tab=judges&jtab=${tab}`
  }
  return `/e/${slug}/manage?tab=judges`
}
