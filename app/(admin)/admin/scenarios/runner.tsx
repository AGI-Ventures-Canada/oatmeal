"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Scenario = {
  name: string
  description: string
}

export function ScenarioRunner({ scenario, disabled }: { scenario: Scenario; disabled?: boolean }) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ hackathonId: string; slug: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleRun() {
    setRunning(true)
    setResult(null)
    setError(null)

    const res = await fetch(`/api/admin/scenarios/${scenario.name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })

    if (res.ok) {
      const data = await res.json()
      setResult(data)
    } else {
      const data = await res.json().catch(() => null)
      setError(data?.error ?? "Failed to run scenario.")
    }

    setRunning(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{scenario.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{scenario.description}</p>
        <Button onClick={handleRun} disabled={running || disabled} size="sm" title={disabled ? "Only available in local development" : undefined}>
          {running ? "Running..." : "Run"}
        </Button>
        {disabled && (
          <p className="text-xs text-muted-foreground">Local development only</p>
        )}
        {result && (
          <div className="space-y-1 text-sm">
            <a
              href={`/e/${result.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-primary underline-offset-4 hover:underline"
            >
              View: /e/{result.slug}
            </a>
            <a
              href={`/admin/hackathons/${result.hackathonId}`}
              className="block text-primary underline-offset-4 hover:underline"
            >
              Edit in admin
            </a>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
