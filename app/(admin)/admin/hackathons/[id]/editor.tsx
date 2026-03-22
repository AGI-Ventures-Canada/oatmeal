"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { useRouter } from "next/navigation"

type Hackathon = {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
  starts_at: string | null
  ends_at: string | null
  registration_opens_at: string | null
  registration_closes_at: string | null
  min_team_size: number | null
  max_team_size: number | null
  max_participants: number | null
  allow_solo: boolean | null
  anonymous_judging: boolean
  rules: string | null
  results_published_at: string | null
}

const STATUSES = ["draft", "published", "registration_open", "active", "judging", "completed", "archived"]

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toISOString().slice(0, 16)
}

export function AdminHackathonEditor({ hackathon }: { hackathon: Hackathon }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState("")

  const [form, setForm] = useState({
    name: hackathon.name,
    slug: hackathon.slug,
    description: hackathon.description ?? "",
    status: hackathon.status,
    starts_at: toDatetimeLocal(hackathon.starts_at),
    ends_at: toDatetimeLocal(hackathon.ends_at),
    registration_opens_at: toDatetimeLocal(hackathon.registration_opens_at),
    registration_closes_at: toDatetimeLocal(hackathon.registration_closes_at),
    min_team_size: hackathon.min_team_size?.toString() ?? "",
    max_team_size: hackathon.max_team_size?.toString() ?? "",
    max_participants: hackathon.max_participants?.toString() ?? "",
    allow_solo: hackathon.allow_solo ?? true,
    anonymous_judging: hackathon.anonymous_judging,
    rules: hackathon.rules ?? "",
  })

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const body: Record<string, unknown> = {
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      status: form.status,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      registration_opens_at: form.registration_opens_at ? new Date(form.registration_opens_at).toISOString() : null,
      registration_closes_at: form.registration_closes_at ? new Date(form.registration_closes_at).toISOString() : null,
      min_team_size: form.min_team_size ? parseInt(form.min_team_size) : null,
      max_team_size: form.max_team_size ? parseInt(form.max_team_size) : null,
      max_participants: form.max_participants ? parseInt(form.max_participants) : null,
      allow_solo: form.allow_solo,
      anonymous_judging: form.anonymous_judging,
      rules: form.rules || null,
    }

    const res = await fetch(`/api/admin/hackathons/${hackathon.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      setMessage("Saved successfully.")
      router.refresh()
    } else {
      const data = await res.json().catch(() => null)
      setMessage(data?.error ?? "Failed to save.")
    }

    setSaving(false)
  }

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/admin/hackathons/${hackathon.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm_name: hackathon.name }),
    })
    if (res.ok) {
      router.push("/admin/hackathons")
    } else {
      setMessage("Failed to delete.")
      setDeleting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !saving) {
      e.preventDefault()
      handleSave(e as unknown as React.FormEvent)
    }
  }

  return (
    <form onSubmit={handleSave} onKeyDown={handleKeyDown} autoComplete="off">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="hackathon-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="hackathon-slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="flex min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dates</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="starts_at">Starts at</Label>
              <Input
                id="starts_at"
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends_at">Ends at</Label>
              <Input
                id="ends_at"
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg_opens">Registration opens</Label>
              <Input
                id="reg_opens"
                type="datetime-local"
                value={form.registration_opens_at}
                onChange={(e) => setForm({ ...form, registration_opens_at: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg_closes">Registration closes</Label>
              <Input
                id="reg_closes"
                type="datetime-local"
                value={form.registration_closes_at}
                onChange={(e) => setForm({ ...form, registration_closes_at: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="min_team">Min team size</Label>
              <Input
                id="min_team"
                type="number"
                value={form.min_team_size}
                onChange={(e) => setForm({ ...form, min_team_size: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_team">Max team size</Label>
              <Input
                id="max_team"
                type="number"
                value={form.max_team_size}
                onChange={(e) => setForm({ ...form, max_team_size: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_participants">Max participants</Label>
              <Input
                id="max_participants"
                type="number"
                value={form.max_participants}
                onChange={(e) => setForm({ ...form, max_participants: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="allow_solo"
                type="checkbox"
                checked={form.allow_solo}
                onChange={(e) => setForm({ ...form, allow_solo: e.target.checked })}
                className="size-4 rounded border"
              />
              <Label htmlFor="allow_solo">Allow solo</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="anon_judging"
                type="checkbox"
                checked={form.anonymous_judging}
                onChange={(e) => setForm({ ...form, anonymous_judging: e.target.checked })}
                className="size-4 rounded border"
              />
              <Label htmlFor="anon_judging">Anonymous judging</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              id="rules"
              className="flex min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={form.rules}
              onChange={(e) => setForm({ ...form, rules: e.target.value })}
            />
          </CardContent>
        </Card>

        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>

          <AlertDialog onOpenChange={(open) => { if (!open) setDeleteConfirmName("") }}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" type="button" disabled={deleting}>
                {deleting ? "Deleting..." : "Delete hackathon"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete hackathon?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes &quot;{hackathon.name}&quot; and all associated data. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <Label htmlFor="delete-confirm-name">Type <strong>{hackathon.name}</strong> to confirm</Label>
                <Input
                  id="delete-confirm-name"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={hackathon.name}
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                  autoFocus
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleteConfirmName !== hackathon.name}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </form>
  )
}
