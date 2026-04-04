"use client"

import { useState, useEffect } from "react"
import { GitBranch, Database, Trophy } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { HackathonStatus } from "@/lib/db/hackathon-types"
import { getTimelineState } from "@/lib/utils/timeline"
import { dispatchDevStatusChanged } from "../events"
import type { EventContext } from "../use-event-context"
import { EMPTY_SEED_STATUS, type SeedStatus } from "./event-shared"
import { EventLifecycleSection } from "./event-lifecycle-section"
import { EventSeedSection } from "./event-seed-section"
import { EventResultsSection } from "./event-results-section"

type SubTab = "lifecycle" | "seed" | "results"

const SUB_TABS: { key: SubTab; label: string; icon: typeof GitBranch }[] = [
  { key: "lifecycle", label: "Lifecycle", icon: GitBranch },
  { key: "seed", label: "Seed", icon: Database },
  { key: "results", label: "Results", icon: Trophy },
]

interface EventToolsTabProps {
  eventContext: EventContext
  onSaveState: () => void
}

export function EventToolsTab({ eventContext, onSaveState }: EventToolsTabProps) {
  const [subTab, setSubTab] = useState<SubTab>("lifecycle")
  const [pending, setPending] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [seedStatus, setSeedStatus] = useState<SeedStatus>(EMPTY_SEED_STATUS)

  const { hackathonId, status, phase, startsAt, endsAt, registrationOpensAt, registrationClosesAt } = eventContext

  useEffect(() => {
    fetch(`/api/dev/hackathons/${hackathonId}/seed-status`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setSeedStatus(data) })
      .catch(() => {})
  }, [hackathonId])

  const timelineState = getTimelineState({
    status: status as HackathonStatus,
    registration_opens_at: registrationOpensAt,
    registration_closes_at: registrationClosesAt,
    starts_at: startsAt,
    ends_at: endsAt,
  })

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  function refreshContext() {
    eventContext.refetch()
    dispatchDevStatusChanged()
  }

  async function devAction(path: string, method = "POST", body?: unknown) {
    const key = path + method
    if (pending) return
    setPending(key)
    try {
      const res = await fetch(`/api/dev/hackathons/${hackathonId}${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        showToast(data?.error ?? "Action failed")
        return
      }
      const data = await res.json()

      const isSeedAction = path.includes("seed") || path === "/seed-data"
      if (isSeedAction) {
        onSaveState()
        window.location.reload()
      } else {
        refreshContext()
      }

      return data
    } catch {
      showToast("Action failed")
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground truncate">{eventContext.name}</span>
        <Badge variant={timelineState.variant} className="text-xs shrink-0">
          {timelineState.label}
        </Badge>
      </div>

      {toast && (
        <div className="rounded-md bg-primary/10 px-3 py-1.5 text-xs text-primary font-medium animate-in fade-in slide-in-from-top-1 duration-200">
          {toast}
        </div>
      )}

      <div className="flex gap-1 border-b pb-0">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setSubTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors rounded-t-md -mb-px border-b-2",
                subTab === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-3" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {subTab === "lifecycle" && (
        <EventLifecycleSection
          hackathonId={hackathonId}
          status={status}
          phase={phase}
          pending={pending}
          setPending={setPending}
          showToast={showToast}
          devAction={devAction}
          onRefresh={refreshContext}
        />
      )}
      {subTab === "seed" && (
        <EventSeedSection
          seedStatus={seedStatus}
          pending={pending}
          devAction={devAction}
        />
      )}
      {subTab === "results" && (
        <EventResultsSection
          seedStatus={seedStatus}
          pending={pending}
          devAction={devAction}
        />
      )}
    </div>
  )
}
