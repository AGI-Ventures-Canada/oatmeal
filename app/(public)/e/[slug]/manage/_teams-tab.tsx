"use client"

import { Fragment, useEffect, useState } from "react"
import {
  Loader2, Plus, Users, ChevronRight, FileText, DoorOpen, Crown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type TeamMember = {
  clerkUserId: string
  displayName: string | null
  email: string | null
  role: string
}

type Team = {
  id: string
  name: string
  status: string
  captainClerkUserId: string
  members: TeamMember[]
  submission: { id: string; title: string; status: string } | null
  room: { id: string; name: string } | null
}

type TeamsTabProps = {
  hackathonId: string
}

export function TeamsTab({ hackathonId }: TeamsTabProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [teamName, setTeamName] = useState("")
  const [captainEmail, setCaptainEmail] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function fetchTeams() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/teams`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to fetch teams")
      }
      const data = await res.json()
      setTeams(data.teams ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch teams")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [hackathonId])

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !creating) {
      e.preventDefault()
      void handleCreate(e as unknown as React.FormEvent)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!teamName.trim() || !captainEmail.trim()) {
      setCreateError("Both fields are required")
      return
    }

    setCreating(true)
    setCreateError(null)

    try {
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName.trim(),
          captainEmail: captainEmail.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to create team")
      }

      setDialogOpen(false)
      setTeamName("")
      setCaptainEmail("")
      setCreateError(null)
      await fetchTeams()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create team")
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border p-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => fetchTeams()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          {teams.length === 0
            ? "No teams yet"
            : `${teams.length} team${teams.length === 1 ? "" : "s"}`}
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Create Team</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Team</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={handleCreate}
              onKeyDown={handleKeyDown}
              className="space-y-4"
              autoComplete="off"
            >
              <div className="space-y-2">
                <label htmlFor="team-name" className="text-xs font-medium">
                  Team Name
                </label>
                <Input
                  id="team-name"
                  name="team-name"
                  type="text"
                  placeholder="Awesome Team"
                  value={teamName}
                  onChange={(e) => {
                    setTeamName(e.target.value)
                    setCreateError(null)
                  }}
                  required
                  autoFocus
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="captain-email" className="text-xs font-medium">
                  Captain Email
                </label>
                <Input
                  id="captain-email"
                  name="captain-email"
                  type="email"
                  placeholder="captain@example.com"
                  value={captainEmail}
                  onChange={(e) => {
                    setCaptainEmail(e.target.value)
                    setCreateError(null)
                  }}
                  required
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>
              {createError && <p className="text-destructive text-sm">{createError}</p>}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Team"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {teams.length > 0 && (
        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Team</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Submission</TableHead>
                  <TableHead>Room</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => {
                  const isExpanded = expandedId === team.id
                  return (
                    <Fragment key={team.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedId(isExpanded ? null : team.id)}
                      >
                        <TableCell className="w-8 pr-0">
                          <ChevronRight className={cn(
                            "size-4 text-muted-foreground transition-transform",
                            isExpanded && "rotate-90",
                          )} />
                        </TableCell>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {team.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">{team.members.length}</span>
                        </TableCell>
                        <TableCell>
                          {team.submission ? (
                            <Badge variant="secondary" className="font-normal">
                              {team.submission.status}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {team.room ? (
                            <span>{team.room.name}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell />
                          <TableCell colSpan={5}>
                            <div className="space-y-3 py-2">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                  <Users className="size-3" />
                                  Members
                                </div>
                                {team.members.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No members</p>
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    {team.members.map((m) => (
                                      <div key={m.clerkUserId} className="flex items-center gap-2 text-sm">
                                        {m.clerkUserId === team.captainClerkUserId && (
                                          <Crown className="size-3 text-primary" />
                                        )}
                                        <span>{m.displayName || m.clerkUserId}</span>
                                        {m.email && (
                                          <span className="text-muted-foreground text-xs">
                                            {m.email}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {team.submission && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <FileText className="size-3" />
                                    Submission
                                  </div>
                                  <p className="text-sm">{team.submission.title}</p>
                                </div>
                              )}

                              {team.room && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                    <DoorOpen className="size-3" />
                                    Room
                                  </div>
                                  <p className="text-sm">{team.room.name}</p>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
