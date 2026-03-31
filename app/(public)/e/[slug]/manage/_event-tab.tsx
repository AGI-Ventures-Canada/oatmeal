"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, CheckCircle2, Send, Eye, ThumbsUp, ThumbsDown } from "lucide-react"
import { VALID_ETABS } from "@/lib/utils/manage-tabs"

type ChallengeData = {
  title: string | null
  body: string | null
  releasedAt: string | null
}

type MentorRequest = {
  id: string
  team_name: string | null
  category: string | null
  description: string | null
  status: "open" | "claimed" | "resolved" | "cancelled"
  created_at: string
}

type SocialSubmission = {
  id: string
  url: string
  platform: string | null
  og_title: string | null
  og_image_url: string | null
  status: "pending" | "approved" | "rejected"
  created_at: string
}

type EmailResult = {
  sent: number
  failed: number
}

interface EventTabContentProps {
  hackathonId: string
  activeEtab: string
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function ChallengeSubTab({ hackathonId }: { hackathonId: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [releasedAt, setReleasedAt] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/challenge`)
        if (!res.ok) throw new Error("Failed to load challenge")
        const data: ChallengeData = await res.json()
        if (cancelled) return
        setTitle(data.title ?? "")
        setBody(data.body ?? "")
        setReleasedAt(data.releasedAt)
      } catch {
        if (!cancelled) setError("Failed to load challenge")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [hackathonId])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/challenge`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save challenge")
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save challenge")
    } finally {
      setSaving(false)
    }
  }

  async function handleRelease() {
    setReleasing(true)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/challenge/release`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to release challenge")
      }
      setReleasedAt(new Date().toISOString())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to release challenge")
    } finally {
      setReleasing(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !saving) {
      e.preventDefault()
      handleSave()
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Challenge</CardTitle>
            <CardDescription>Define the problem statement for participants</CardDescription>
          </div>
          {releasedAt && (
            <Badge variant="secondary">
              Released {formatDate(releasedAt)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => { e.preventDefault(); handleSave() }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="challenge-title">Title</Label>
            <Input
              id="challenge-title"
              name="challenge-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Challenge title"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="challenge-body">Description</Label>
            <Textarea
              id="challenge-body"
              name="challenge-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Describe the challenge in detail..."
              rows={8}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                Save
              </Button>
              {success && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle2 className="size-3" />
                  Saved
                </span>
              )}
            </div>
            {!releasedAt && (
              <Button
                type="button"
                variant="outline"
                disabled={releasing || !title.trim()}
                onClick={handleRelease}
              >
                {releasing && <Loader2 className="animate-spin" />}
                <Eye />
                <span className="hidden sm:inline">Release Challenge</span>
                <span className="sm:hidden">Release</span>
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function MentorsSubTab({ hackathonId }: { hackathonId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requests, setRequests] = useState<MentorRequest[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/mentor-requests`)
        if (!res.ok) throw new Error("Failed to load mentor requests")
        const data = await res.json()
        if (cancelled) return
        setRequests(data.requests)
      } catch {
        if (!cancelled) setError("Failed to load mentor requests")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [hackathonId])

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
  }

  if (error) {
    return <div className="rounded-lg border p-8 text-center text-destructive">{error}</div>
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        No mentor requests yet
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mentor Requests</CardTitle>
        <CardDescription>{requests.length} request{requests.length !== 1 ? "s" : ""} in queue</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{req.team_name ?? "No team"}</TableCell>
                  <TableCell>{req.category ?? "-"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{req.description ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={req.status === "open" ? "default" : "secondary"}>
                      {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(req.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function SocialSubTab({ hackathonId }: { hackathonId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<SocialSubmission[]>([])
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/social-submissions`)
        if (!res.ok) throw new Error("Failed to load social submissions")
        const data = await res.json()
        if (cancelled) return
        setSubmissions(data.submissions)
      } catch {
        if (!cancelled) setError("Failed to load social submissions")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [hackathonId])

  async function handleReview(submissionId: string, status: "approved" | "rejected") {
    setReviewingId(submissionId)
    try {
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/social-submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("Failed to review submission")
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? { ...s, status } : s))
      )
    } catch {
      setError("Failed to review submission")
    } finally {
      setReviewingId(null)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
  }

  if (error) {
    return <div className="rounded-lg border p-8 text-center text-destructive">{error}</div>
  }

  if (submissions.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        No social submissions yet
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Social Submissions</CardTitle>
        <CardDescription>{submissions.length} submission{submissions.length !== 1 ? "s" : ""}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {submissions.map((sub) => (
            <div key={sub.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 min-w-0">
                {sub.og_image_url && (
                  <img
                    src={sub.og_image_url}
                    alt=""
                    className="h-12 w-20 shrink-0 rounded object-cover bg-muted"
                  />
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">
                    {sub.og_title ?? sub.url}
                  </p>
                  <a
                    href={sub.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:underline truncate block"
                  >
                    {sub.url}
                  </a>
                  <div className="mt-1 flex items-center gap-2">
                    {sub.platform && <Badge variant="outline">{sub.platform}</Badge>}
                    <Badge
                      variant={
                        sub.status === "approved"
                          ? "secondary"
                          : sub.status === "rejected"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {sub.status}
                    </Badge>
                  </div>
                </div>
              </div>
              {sub.status === "pending" && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={reviewingId === sub.id}
                    onClick={() => handleReview(sub.id, "approved")}
                  >
                    {reviewingId === sub.id ? <Loader2 className="animate-spin" /> : <ThumbsUp />}
                    <span className="hidden sm:inline">Approve</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={reviewingId === sub.id}
                    onClick={() => handleReview(sub.id, "rejected")}
                  >
                    {reviewingId === sub.id ? <Loader2 className="animate-spin" /> : <ThumbsDown />}
                    <span className="hidden sm:inline">Reject</span>
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function EmailSubTab({ hackathonId }: { hackathonId: string }) {
  const [subject, setSubject] = useState("")
  const [html, setHtml] = useState("")
  const [roles, setRoles] = useState<Record<string, boolean>>({
    participant: false,
    judge: false,
    mentor: false,
  })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<EmailResult | null>(null)

  const selectedRoles = Object.entries(roles)
    .filter(([, checked]) => checked)
    .map(([role]) => role)

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!subject.trim() || !html.trim()) return
    setSending(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/email-blast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          html,
          recipientFilter: selectedRoles.length > 0 ? selectedRoles : undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to send emails")
      }
      const data: EmailResult = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send emails")
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !sending) {
      e.preventDefault()
      handleSend()
    }
  }

  function toggleRole(role: string) {
    setRoles((prev) => ({ ...prev, [role]: !prev[role] }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Blast</CardTitle>
        <CardDescription>Send an email to all or filtered participants</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSend}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              name="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-body">HTML Body</Label>
            <Textarea
              id="email-body"
              name="email-body"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="<h1>Hello!</h1><p>Your email content here...</p>"
              rows={10}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
          </div>
          <div className="space-y-2">
            <Label>Filter by role (optional)</Label>
            <div className="flex flex-wrap gap-4">
              {(["participant", "judge", "mentor"] as const).map((role) => (
                <div key={role} className="flex items-center gap-2">
                  <Checkbox
                    id={`role-${role}`}
                    checked={roles[role]}
                    onCheckedChange={() => toggleRole(role)}
                  />
                  <Label htmlFor={`role-${role}`} className="capitalize">
                    {role}s
                  </Label>
                </div>
              ))}
            </div>
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
          {result && (
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <CheckCircle2 className="size-4 text-muted-foreground shrink-0" />
              <span className="text-xs">
                {result.sent} sent{result.failed > 0 ? `, ${result.failed} failed` : ""}
              </span>
            </div>
          )}
          <Button type="submit" disabled={sending || !subject.trim() || !html.trim()}>
            {sending ? <Loader2 className="animate-spin" /> : <Send />}
            Send
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function EventTabContent({ hackathonId, activeEtab }: EventTabContentProps) {
  const [currentTab, setCurrentTab] = useState(activeEtab)

  return (
    <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
      <div className="overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
        <TabsList>
          {VALID_ETABS.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="capitalize">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="challenge" forceMount className="data-[state=inactive]:hidden">
        <ChallengeSubTab hackathonId={hackathonId} />
      </TabsContent>

      <TabsContent value="mentors" forceMount className="data-[state=inactive]:hidden">
        <MentorsSubTab hackathonId={hackathonId} />
      </TabsContent>

      <TabsContent value="social" forceMount className="data-[state=inactive]:hidden">
        <SocialSubTab hackathonId={hackathonId} />
      </TabsContent>

      <TabsContent value="email" forceMount className="data-[state=inactive]:hidden">
        <EmailSubTab hackathonId={hackathonId} />
      </TabsContent>
    </Tabs>
  )
}
