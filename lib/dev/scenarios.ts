export type ScenarioCategory = "lifecycle" | "judging" | "results"
export type ScenarioPersona = "organizer" | "participant" | "judge"

export type ScenarioDef = {
  name: string
  label: string
  description: string
  category: ScenarioCategory
  defaultPersona: ScenarioPersona
  defaultRoute: (slug: string) => string
}

export const SCENARIOS: ScenarioDef[] = [
  {
    name: "pre-registration",
    label: "Pre-Registration",
    description: "Hackathon not yet open (opens tomorrow)",
    category: "lifecycle",
    defaultPersona: "organizer",
    defaultRoute: (s) => `/e/${s}/manage`,
  },
  {
    name: "registered-no-team",
    label: "Registered (No Team)",
    description: "Registered, no team yet",
    category: "lifecycle",
    defaultPersona: "participant",
    defaultRoute: (s) => `/e/${s}`,
  },
  {
    name: "team-formed",
    label: "Team Formed",
    description: "Captain with 2 members + 1 invite",
    category: "lifecycle",
    defaultPersona: "participant",
    defaultRoute: (s) => `/e/${s}`,
  },
  {
    name: "submitted",
    label: "Project Submitted",
    description: "Team has a submitted project",
    category: "lifecycle",
    defaultPersona: "participant",
    defaultRoute: (s) => `/e/${s}`,
  },
  {
    name: "judging",
    label: "Judging (Fresh)",
    description: "5 teams, 3 judges, no scores",
    category: "judging",
    defaultPersona: "judge",
    defaultRoute: (s) => `/e/${s}/judge`,
  },
  {
    name: "judging-in-progress",
    label: "Judging (60% Scored)",
    description: "~60% of assignments scored",
    category: "judging",
    defaultPersona: "judge",
    defaultRoute: (s) => `/e/${s}/judge`,
  },
  {
    name: "results-ready",
    label: "Results Ready",
    description: "All scored, results calculated, 3 prizes",
    category: "results",
    defaultPersona: "organizer",
    defaultRoute: (s) => `/e/${s}/manage`,
  },
]

export const SCENARIO_NAMES = SCENARIOS.map((s) => s.name)

export function getScenario(name: string): ScenarioDef | undefined {
  return SCENARIOS.find((s) => s.name === name)
}

export const CATEGORY_LABELS: Record<ScenarioCategory, string> = {
  lifecycle: "Lifecycle",
  judging: "Judging",
  results: "Results",
}
