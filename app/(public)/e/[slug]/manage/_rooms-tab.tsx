"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { EventTimer } from "@/components/hackathon/event-timer"
import {
  Plus,
  Pencil,
  Trash2,
  Timer,
  TimerOff,
  Pause,
  Play,
  DoorOpen,
  Loader2,
  CheckCircle2,
  Check,
} from "lucide-react"

type RoomTeamInfo = {
  id: string
  room_id: string
  team_id: string
  has_presented: boolean
  present_order: number | null
  team_name: string
}

type Room = {
  id: string
  hackathon_id: string
  name: string
  display_order: number
  timer_ends_at: string | null
  timer_remaining_ms: number | null
  timer_label: string | null
  created_at: string
  teamCount: number
  presentedCount: number
  teams: RoomTeamInfo[]
}

interface RoomsTabProps {
  hackathonId: string
}

function formatPausedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(minutes)}:${pad(seconds)}`
}

export function RoomsTab({ hackathonId }: RoomsTabProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [roomDialogOpen, setRoomDialogOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [roomName, setRoomName] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [timerDialogOpen, setTimerDialogOpen] = useState(false)
  const [timerRoomId, setTimerRoomId] = useState<string | null>(null)
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null)
  const [customMinutes, setCustomMinutes] = useState("")
  const [timerLabel, setTimerLabel] = useState("")
  const [savingTimer, setSavingTimer] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingTeam, setTogglingTeam] = useState<string | null>(null)

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/rooms`)
      if (!res.ok) throw new Error("Failed to fetch rooms")
      const data = await res.json()
      setRooms(data.rooms ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rooms")
    } finally {
      setLoading(false)
    }
  }, [hackathonId])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  function openCreate() {
    setEditingRoom(null)
    setRoomName("")
    setError(null)
    setSaveSuccess(false)
    setRoomDialogOpen(true)
  }

  function openEdit(room: Room) {
    setEditingRoom(room)
    setRoomName(room.name)
    setError(null)
    setSaveSuccess(false)
    setRoomDialogOpen(true)
  }

  const DURATION_PRESETS = [
    { label: "3 min", minutes: 3 },
    { label: "5 min", minutes: 5 },
    { label: "10 min", minutes: 10 },
    { label: "15 min", minutes: 15 },
    { label: "30 min", minutes: 30 },
    { label: "1 hr", minutes: 60 },
  ]

  function openTimer(roomId: string, room: Room) {
    setTimerRoomId(roomId)
    setTimerMinutes(null)
    setCustomMinutes("")
    setTimerLabel(room.timer_label ?? "")
    setError(null)
    setTimerDialogOpen(true)
  }

  async function handleRoomSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = roomName.trim()
    if (!trimmed) {
      setError("Name is required")
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (editingRoom) {
        const res = await fetch(
          `/api/dashboard/hackathons/${hackathonId}/rooms/${editingRoom.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: trimmed }),
          }
        )
        if (!res.ok) throw new Error("Failed to update room")
        const updated = await res.json()
        setRooms((prev) =>
          prev.map((r) => (r.id === editingRoom.id ? { ...r, ...updated } : r))
        )
      } else {
        const res = await fetch(
          `/api/dashboard/hackathons/${hackathonId}/rooms`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: trimmed, displayOrder: rooms.length }),
          }
        )
        if (!res.ok) throw new Error("Failed to create room")
        const created = await res.json()
        setRooms((prev) => [
          ...prev,
          {
            ...created,
            teamCount: 0,
            presentedCount: 0,
            teams: [],
          },
        ])
      }
      setSaveSuccess(true)
      setTimeout(() => setRoomDialogOpen(false), 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(roomId: string) {
    setDeletingId(roomId)
    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/rooms/${roomId}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error("Failed to delete room")
      setRooms((prev) => prev.filter((r) => r.id !== roomId))
    } catch {
      setError("Failed to delete room")
    } finally {
      setDeletingId(null)
    }
  }

  async function submitTimer(minutes: number) {
    if (!timerRoomId || minutes <= 0) return

    setSavingTimer(true)
    setError(null)

    try {
      const endsAt = new Date(Date.now() + minutes * 60_000).toISOString()
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/rooms/${timerRoomId}/timer`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endsAt,
            label: timerLabel.trim() || undefined,
          }),
        }
      )
      if (!res.ok) throw new Error("Failed to set timer")
      const updated = await res.json()
      setRooms((prev) =>
        prev.map((r) =>
          r.id === timerRoomId
            ? { ...r, timer_ends_at: updated.timer_ends_at, timer_label: updated.timer_label }
            : r
        )
      )
      setTimerDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set timer")
    } finally {
      setSavingTimer(false)
    }
  }

  async function handleTimerSubmit(e: React.FormEvent) {
    e.preventDefault()
    const mins = timerMinutes ?? (customMinutes ? parseInt(customMinutes, 10) : 0)
    if (!mins || mins <= 0) {
      setError("Select a duration or enter custom minutes")
      return
    }
    await submitTimer(mins)
  }

  async function handleClearTimer(roomId: string) {
    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/rooms/${roomId}/timer`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      )
      if (!res.ok) throw new Error("Failed to clear timer")
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId ? { ...r, timer_ends_at: null, timer_remaining_ms: null, timer_label: null } : r
        )
      )
    } catch {
      setError("Failed to clear timer")
    }
  }

  async function handlePauseTimer(roomId: string) {
    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/rooms/${roomId}/timer/pause`,
        { method: "POST" }
      )
      if (!res.ok) throw new Error("Failed to pause timer")
      const updated = await res.json()
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId
            ? { ...r, timer_ends_at: updated.timer_ends_at, timer_remaining_ms: updated.timer_remaining_ms }
            : r
        )
      )
    } catch {
      setError("Failed to pause timer")
    }
  }

  async function handleResumeTimer(roomId: string) {
    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/rooms/${roomId}/timer/resume`,
        { method: "POST" }
      )
      if (!res.ok) throw new Error("Failed to resume timer")
      const updated = await res.json()
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId
            ? { ...r, timer_ends_at: updated.timer_ends_at, timer_remaining_ms: updated.timer_remaining_ms }
            : r
        )
      )
    } catch {
      setError("Failed to resume timer")
    }
  }

  async function handleTogglePresented(
    roomId: string,
    teamId: string,
    presented: boolean
  ) {
    const key = `${roomId}-${teamId}`
    setTogglingTeam(key)
    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/rooms/${roomId}/teams/${teamId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ presented }),
        }
      )
      if (!res.ok) throw new Error("Failed to update")
      setRooms((prev) =>
        prev.map((r) => {
          if (r.id !== roomId) return r
          const teams = r.teams.map((t) =>
            t.team_id === teamId ? { ...t, has_presented: presented } : t
          )
          return {
            ...r,
            teams,
            presentedCount: teams.filter((t) => t.has_presented).length,
          }
        })
      )
    } catch {
      setError("Failed to update presentation status")
    } finally {
      setTogglingTeam(null)
    }
  }

  function handleRoomKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !saving) {
      e.preventDefault()
      handleRoomSubmit(e as unknown as React.FormEvent)
    }
  }

  function handleTimerKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !savingTimer) {
      e.preventDefault()
      handleTimerSubmit(e as unknown as React.FormEvent)
    }
  }

  if (loading) {
    return <div className="h-64 rounded-lg bg-muted animate-pulse" />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Rooms</h3>
          <p className="text-sm text-muted-foreground">
            Organize teams into presentation rooms with timers
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          <span className="hidden sm:inline">Create Room</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {error && !roomDialogOpen && !timerDialogOpen && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {rooms.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <DoorOpen className="mx-auto size-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No rooms yet. Create rooms to organize team presentations.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <Card key={room.id}>
              <CardHeader>
                <CardTitle className="text-base">{room.name}</CardTitle>
                <CardAction>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(room)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive"
                          disabled={deletingId === room.id}
                        >
                          {deletingId === room.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete &quot;{room.name}&quot;?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this room and remove all
                            team assignments.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => handleDelete(room.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {room.teamCount} {room.teamCount === 1 ? "team" : "teams"}
                  </Badge>
                  <Badge
                    variant={
                      room.teamCount > 0 &&
                      room.presentedCount === room.teamCount
                        ? "default"
                        : "outline"
                    }
                  >
                    {room.presentedCount}/{room.teamCount} presented
                  </Badge>
                </div>

                {room.timer_ends_at ? (
                  <div className="rounded-md bg-muted p-3">
                    <EventTimer
                      endsAt={room.timer_ends_at}
                      label={room.timer_label ?? undefined}
                      size="sm"
                    />
                    <div className="mt-2 flex gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        className="flex-1"
                        onClick={() => handlePauseTimer(room.id)}
                      >
                        <Pause className="mr-1 size-3" />
                        Pause
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="flex-1 text-muted-foreground"
                        onClick={() => handleClearTimer(room.id)}
                      >
                        <TimerOff className="mr-1 size-3" />
                        Clear
                      </Button>
                    </div>
                  </div>
                ) : room.timer_remaining_ms ? (
                  <div className="rounded-md border border-dashed p-3">
                    <div className="flex flex-col items-center gap-1">
                      {room.timer_label && (
                        <span className="text-xs text-muted-foreground">
                          {room.timer_label}
                        </span>
                      )}
                      <span className="font-mono text-lg font-bold text-muted-foreground">
                        {formatPausedTime(room.timer_remaining_ms)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        Paused
                      </Badge>
                    </div>
                    <div className="mt-2 flex gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        className="flex-1"
                        onClick={() => handleResumeTimer(room.id)}
                      >
                        <Play className="mr-1 size-3" />
                        Resume
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="flex-1 text-muted-foreground"
                        onClick={() => handleClearTimer(room.id)}
                      >
                        <TimerOff className="mr-1 size-3" />
                        Clear
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => openTimer(room.id, room)}
                  >
                    <Timer className="mr-1.5 size-3.5" />
                    Set Timer
                  </Button>
                )}

                {room.teams.length > 0 && (
                  <div className="space-y-1.5">
                    {room.teams.map((team) => {
                      const key = `${room.id}-${team.team_id}`
                      return (
                        <div
                          key={team.id}
                          className="flex items-center justify-between rounded-md bg-muted px-3 py-2"
                        >
                          <span
                            className={cn(
                              "text-sm",
                              team.has_presented && "text-muted-foreground"
                            )}
                          >
                            {team.team_name}
                          </span>
                          <Button
                            variant={team.has_presented ? "ghost" : "outline"}
                            size="xs"
                            disabled={togglingTeam === key}
                            onClick={() =>
                              handleTogglePresented(
                                room.id,
                                team.team_id,
                                !team.has_presented
                              )
                            }
                          >
                            {togglingTeam === key ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : team.has_presented ? (
                              <>
                                <Check className="mr-1 size-3" />
                                Presented
                              </>
                            ) : (
                              "Mark Presented"
                            )}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? "Edit Room" : "Create Room"}
            </DialogTitle>
          </DialogHeader>
          {saveSuccess ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="size-10 text-primary" />
              <p className="text-sm font-medium">
                {editingRoom ? "Room updated" : "Room created"}
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleRoomSubmit}
              onKeyDown={handleRoomKeyDown}
              autoComplete="off"
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="room-name">Name</Label>
                <Input
                  id="room-name"
                  name="room-name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. Room A"
                  autoFocus
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRoomDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {editingRoom ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={timerDialogOpen} onOpenChange={setTimerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Room Timer</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleTimerSubmit}
            onKeyDown={handleTimerKeyDown}
            autoComplete="off"
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Duration</Label>
              <div className="grid grid-cols-3 gap-2">
                {DURATION_PRESETS.map((preset) => (
                  <Button
                    key={preset.minutes}
                    type="button"
                    variant={timerMinutes === preset.minutes ? "default" : "outline"}
                    size="sm"
                    disabled={savingTimer}
                    onClick={() => {
                      setTimerMinutes(preset.minutes)
                      setCustomMinutes("")
                      setError(null)
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="custom-minutes"
                  name="custom-minutes"
                  type="number"
                  min="1"
                  max="480"
                  value={customMinutes}
                  onChange={(e) => {
                    setCustomMinutes(e.target.value)
                    setTimerMinutes(null)
                    setError(null)
                  }}
                  placeholder="Custom minutes"
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
                <span className="text-sm text-muted-foreground shrink-0">min</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timer-label">Label (optional)</Label>
              <Input
                id="timer-label"
                name="timer-label"
                value={timerLabel}
                onChange={(e) => setTimerLabel(e.target.value)}
                placeholder="e.g. Presentation Time"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTimerDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingTimer || (!timerMinutes && !customMinutes)}>
                {savingTimer && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Start Timer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
