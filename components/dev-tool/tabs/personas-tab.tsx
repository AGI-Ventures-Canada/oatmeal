"use client"

import { useState, useEffect } from "react"
import { Loader2, ArrowRight, UserPlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { EventContext } from "../use-event-context"
import type { Tab } from "../dev-tool-panel"

type Persona = {
  key: string
  name: string
  configured: boolean
}

const ASSIGNABLE_ROLES = [
  { role: "participant", label: "Participant" },
  { role: "judge", label: "Judge" },
  { role: "organizer", label: "Organizer" },
  { role: "mentor", label: "Mentor" },
] as const

interface PersonasTabProps {
  eventContext: EventContext | null
  onSwitchTab?: (tab: Tab) => void
}

export function PersonasTab({ eventContext, onSwitchTab }: PersonasTabProps) {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [personaRoles, setPersonaRoles] = useState<Record<string, string>>({})
  const [switching, setSwitching] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [myRoles, setMyRoles] = useState<string[]>([])
  const [assigningRole, setAssigningRole] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/scenario-personas")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.personas) {
          setPersonas(data.personas.filter((p: Persona) => p.configured))
        }
      })
      .catch(() => setError("Failed to load personas"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const hackathonId = eventContext?.hackathonId
    if (!hackathonId) return

    fetch(`/api/admin/persona-roles?hackathonId=${hackathonId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.roles) setPersonaRoles(data.roles)
        else setPersonaRoles({})
      })
      .catch(() => setPersonaRoles({}))
  }, [eventContext?.hackathonId])

  useEffect(() => {
    const hackathonId = eventContext?.hackathonId
    if (!hackathonId) return

    fetchMyRoles(hackathonId)
  }, [eventContext?.hackathonId])

  function fetchMyRoles(hackathonId: string) {
    fetch(`/api/dev/hackathons/${hackathonId}/my-roles`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.roles) setMyRoles(data.roles)
        else setMyRoles([])
      })
      .catch(() => setMyRoles([]))
  }

  async function assignRole(role: string) {
    if (!eventContext?.hackathonId || assigningRole) return
    setAssigningRole(role)
    setError(null)

    try {
      const res = await fetch(`/api/dev/hackathons/${eventContext.hackathonId}/assign-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? "Failed to assign role")
        return
      }

      fetchMyRoles(eventContext.hackathonId)
    } catch {
      setError("Network error")
    } finally {
      setAssigningRole(null)
    }
  }

  async function removeRole(role: string) {
    if (!eventContext?.hackathonId || assigningRole) return
    setAssigningRole(role)
    setError(null)

    try {
      const res = await fetch(`/api/dev/hackathons/${eventContext.hackathonId}/remove-role`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? "Failed to remove role")
        return
      }

      fetchMyRoles(eventContext.hackathonId)
    } catch {
      setError("Network error")
    } finally {
      setAssigningRole(null)
    }
  }

  async function switchTo(persona: Persona) {
    setSwitching(persona.key)
    setError(null)

    try {
      const res = await fetch("/api/admin/scenario-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: persona.key,
          redirect: window.location.pathname,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? "Switch failed")
        setSwitching(null)
        return
      }

      const { loginUrl } = await res.json()
      window.location.assign(loginUrl)
    } catch {
      setError("Network error")
      setSwitching(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

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

      {eventContext && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <UserPlus className="size-3 text-muted-foreground" />
            <span className="text-xs font-medium">Quick Assign (Current User)</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Assign yourself a role on <strong>{eventContext.name}</strong>
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {ASSIGNABLE_ROLES.map(({ role, label }) => {
              const isActive = myRoles.includes(role)
              return (
                <Button
                  key={role}
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  disabled={!!assigningRole}
                  onClick={() => isActive ? removeRole(role) : assignRole(role)}
                  className={cn(
                    "h-8 text-xs justify-between",
                    isActive && "pr-2"
                  )}
                >
                  <span className="truncate">{label}</span>
                  {assigningRole === role ? (
                    <Loader2 className="size-3 animate-spin shrink-0" />
                  ) : isActive ? (
                    <X className="size-3 shrink-0" />
                  ) : null}
                </Button>
              )
            })}
          </div>
          {myRoles.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-muted-foreground">Active:</span>
              {myRoles.map((role) => (
                <Badge key={role} variant="secondary" className="text-[10px] h-4 px-1 capitalize">
                  {role}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {personas.length > 0 && (
        <>
          {eventContext && (
            <div className="border-t pt-2">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Switch User
              </span>
            </div>
          )}
          <div className="space-y-1">
            {personas.map((p) => (
              <Button
                key={p.key}
                variant="ghost"
                disabled={!!switching}
                onClick={() => switchTo(p)}
                className="h-auto w-full justify-start gap-2 px-3 py-2 text-xs"
              >
                {switching === p.key ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                ) : (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                    {p.name[0]}
                  </span>
                )}
                <span className="truncate text-left">{p.name}</span>
                {personaRoles[p.key] && (
                  <span className="shrink-0 text-[10px] text-muted-foreground capitalize ml-auto">
                    {personaRoles[p.key]}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </>
      )}

      {personas.length === 0 && !eventContext && (
        <div className="py-4 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            No test personas configured. Add user IDs in the <strong>Config</strong> tab or set env vars in <code className="text-[10px]">.env.local</code>.
          </p>
          {onSwitchTab && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onSwitchTab("config")}
            >
              Open Config
              <ArrowRight className="size-3 ml-1" />
            </Button>
          )}
        </div>
      )}

      {personas.length === 0 && eventContext && (
        <p className="text-[10px] text-muted-foreground text-center">
          Configure test personas in <strong>Config</strong> tab to switch between users.
        </p>
      )}
    </div>
  )
}
