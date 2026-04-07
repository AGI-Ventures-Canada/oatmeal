"use client"

import { useState, useEffect } from "react"
import { Loader2, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SCENARIOS, CATEGORY_LABELS, type ScenarioDef, type ScenarioCategory } from "@/lib/dev/scenarios"

type ActiveScenario = {
  scenarioName: string
  hackathonId: string
  slug: string
  createdAt: string
}

type RoleCard = {
  personaKey: string
  name: string
  role: string
  loginUrl: string
  directUrl: string
}

export function ScenariosTab() {
  const [activeScenarios, setActiveScenarios] = useState<ActiveScenario[]>([])
  const [running, setRunning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingActive, setLoadingActive] = useState(true)

  useEffect(() => {
    fetch("/api/admin/scenario-active")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.scenarios) setActiveScenarios(data.scenarios)
      })
      .catch(() => {})
      .finally(() => setLoadingActive(false))
  }, [])

  async function quickLaunch(scenario: ScenarioDef) {
    setRunning(scenario.name)
    setError(null)

    try {
      const res = await fetch(`/api/admin/scenario-run/${scenario.name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? "Failed to run scenario")
        setRunning(null)
        return
      }

      const data = await res.json()
      const redirect = scenario.defaultRoute(data.slug)

      const personaMap: Record<string, string> = { organizer: "organizer", participant: "user1", judge: "user1" }
      const targetRole = data.roles?.find((r: RoleCard) => r.role === scenario.defaultPersona)

      if (targetRole) {
        window.location.assign(targetRole.loginUrl)
        return
      }

      const switchRes = await fetch("/api/admin/scenario-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: personaMap[scenario.defaultPersona] ?? "organizer",
          redirect,
        }),
      })

      if (switchRes.ok) {
        const { loginUrl } = await switchRes.json()
        window.location.assign(loginUrl)
      } else {
        window.location.assign(redirect)
      }
    } catch {
      setError("Network error")
      setRunning(null)
    }
  }

  const grouped = SCENARIOS.reduce(
    (acc, s) => {
      const cat = s.category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(s)
      return acc
    },
    {} as Record<ScenarioCategory, ScenarioDef[]>
  )

  return (
    <div className="space-y-3">
      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive bg-destructive/10 px-3 py-1.5 text-xs text-destructive cursor-pointer"
          onClick={() => setError(null)}
        >
          {error}
        </div>
      )}

      {(Object.keys(grouped) as ScenarioCategory[]).map((cat) => (
        <div key={cat} className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {CATEGORY_LABELS[cat]}
          </div>
          {grouped[cat].map((scenario) => {
            const active = activeScenarios.find((a) => a.scenarioName === scenario.name)
            const isRunning = running === scenario.name

            return (
              <div key={scenario.name} className="flex items-center gap-2 rounded-md border px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{scenario.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{scenario.description}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => window.location.assign(scenario.defaultRoute(active.slug))}
                    >
                      Go
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    disabled={!!running}
                    onClick={() => quickLaunch(scenario)}
                  >
                    {isRunning ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Play className="size-3" />
                    )}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      {loadingActive && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
