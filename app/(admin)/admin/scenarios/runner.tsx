"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RefreshCw } from "lucide-react"
import type { ActiveScenario, RoleCard, ScenarioOption } from "@/lib/services/admin-scenarios"

type Scenario = {
  name: string
  description: string
  options: ScenarioOption[]
}

type ScenarioResult = {
  hackathonId: string
  slug: string
  roles: RoleCard[]
}

const ROLE_LABEL: Record<string, string> = {
  organizer: "Organizer",
  judge: "Judge",
  participant: "Participant",
}

const ROLE_AVATAR: Record<string, string> = {
  organizer: "bg-primary text-primary-foreground",
  judge: "bg-destructive text-destructive-foreground",
  participant: "bg-muted text-muted-foreground",
}

function RoleCards({
  result,
  onRefresh,
  refreshing,
}: {
  result: ScenarioResult
  onRefresh: () => void
  refreshing: boolean
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <a
          href={`/admin/hackathons/${result.hackathonId}`}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Edit in admin →
        </a>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          className="gap-1.5 text-xs"
          title="Tokens expire in 1 hour — click to generate fresh ones"
        >
          <RefreshCw className={`size-3 ${refreshing ? "animate-spin" : ""}`} />
          Refresh tokens
        </Button>
      </div>

      {result.roles.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No test personas found. Run{" "}
          <code className="font-mono">bun run scripts/provision-test-users.ts</code> to set up test
          accounts, then re-run the scenario.
        </p>
      )}

      {result.roles.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {result.roles.map((role) => (
            <div
              key={role.personaKey}
              className="flex flex-col gap-2.5 rounded-md border p-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                <div className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${ROLE_AVATAR[role.role] ?? "bg-muted text-muted-foreground"}`}>
                  {role.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium leading-none">{role.name}</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {ROLE_LABEL[role.role] ?? role.role}
                  </Badge>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="w-full text-xs">
                <a href={role.loginUrl} target="_blank" rel="noopener noreferrer">
                  Open
                </a>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ExistingRun({
  existing,
  onGetLinks,
  onRerun,
  loading,
}: {
  existing: ActiveScenario
  onGetLinks: () => void
  onRerun: () => void
  loading: boolean
}) {
  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <p className="text-xs text-muted-foreground">
        Last run:{" "}
        <a
          href={`/e/${existing.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-primary underline-offset-4 hover:underline"
        >
          {existing.slug}
        </a>
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onGetLinks} disabled={loading} className="text-xs">
          {loading ? <RefreshCw className="size-3 animate-spin" /> : "Get login links"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onRerun} disabled={loading} className="text-xs">
          Re-run
        </Button>
      </div>
    </div>
  )
}

export function ScenarioRunner({
  scenario,
  existingRun,
}: {
  scenario: Scenario
  existingRun: ActiveScenario | null
}) {
  const [running, setRunning] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [result, setResult] = useState<ScenarioResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, boolean>>({})

  async function handleRun() {
    setRunning(true)
    setResult(null)
    setError(null)

    const hasOptions = Object.values(selectedOptions).some(Boolean)
    const res = await fetch(`/api/admin/scenario-run/${scenario.name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hasOptions ? { options: selectedOptions } : {}),
    })

    const data = await res.json().catch(() => null)

    if (res.ok) {
      setResult(data)
    } else {
      setError(data?.error ?? `Request failed (${res.status})`)
    }

    setRunning(false)
  }

  async function handleGetLinks(hackathonId: string) {
    setRefreshing(true)
    setError(null)

    const res = await fetch("/api/admin/scenario-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hackathon_id: hackathonId }),
    })

    const data = await res.json().catch(() => null)

    if (res.ok) {
      setResult({ hackathonId, slug: existingRun?.slug ?? "", roles: data.roles })
    } else {
      setError(data?.error ?? `Request failed (${res.status})`)
    }

    setRefreshing(false)
  }

  async function handleRefreshTokens() {
    if (!result) return
    setRefreshing(true)

    const res = await fetch("/api/admin/scenario-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hackathon_id: result.hackathonId }),
    })

    const data = await res.json().catch(() => null)

    if (res.ok) {
      setResult((prev) => (prev ? { ...prev, roles: data.roles } : prev))
    } else {
      setError(data?.error ?? `Request failed (${res.status})`)
    }

    setRefreshing(false)
  }

  const showExisting = existingRun && !result

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{scenario.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{scenario.description}</p>

        {showExisting && (
          <ExistingRun
            existing={existingRun}
            onGetLinks={() => handleGetLinks(existingRun.hackathonId)}
            onRerun={handleRun}
            loading={running || refreshing}
          />
        )}

        {!showExisting && !result && (
          <div className="space-y-3">
            {scenario.options.length > 0 && (
              <div className="space-y-2">
                {scenario.options.map((opt) => (
                  <div key={opt.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`${scenario.name}-${opt.key}`}
                      checked={selectedOptions[opt.key] ?? false}
                      onCheckedChange={(checked) => {
                        setSelectedOptions((prev) => ({
                          ...prev,
                          [opt.key]: checked === true,
                        }))
                      }}
                    />
                    <Label
                      htmlFor={`${scenario.name}-${opt.key}`}
                      className="text-sm font-normal"
                    >
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
            )}
            <Button onClick={handleRun} disabled={running} size="sm">
              {running ? "Running…" : "Run"}
            </Button>
          </div>
        )}

        {result && (
          <RoleCards result={result} onRefresh={handleRefreshTokens} refreshing={refreshing} />
        )}

        {result && (
          <Button
            onClick={handleRun}
            disabled={running}
            size="sm"
            variant="ghost"
            className="text-xs"
          >
            {running ? "Running…" : "Re-run"}
          </Button>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
