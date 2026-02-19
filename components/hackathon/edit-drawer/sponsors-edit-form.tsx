"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { OptimizedImage } from "@/components/ui/optimized-image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Field,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field"
import { useEdit } from "@/components/hackathon/preview/edit-context"
import { Badge } from "@/components/ui/badge"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Trash2, Plus, Building2, Loader2, Undo2, ExternalLink } from "lucide-react"
import type { HackathonSponsor, SponsorTier, TenantProfile } from "@/lib/db/hackathon-types"

type SponsorWithTenant = HackathonSponsor & {
  tenant?: Pick<TenantProfile, "slug" | "name" | "logo_url" | "logo_url_dark"> | null
}

interface SponsorsEditFormProps {
  hackathonId: string
  initialSponsors: SponsorWithTenant[]
  onSaveAndNext?: () => void
}

interface OrgSearchResult {
  id: string
  name: string
  slug: string | null
  logoUrl: string | null
  websiteUrl: string | null
}

type PendingChange =
  | { type: "add"; sponsor: SponsorWithTenant; tempId: string }
  | { type: "delete"; sponsorId: string; originalSponsor: SponsorWithTenant }
  | { type: "tier"; sponsorId: string; newTier: SponsorTier; oldTier: SponsorTier }

function useOrgSearch(excludeIdsString: string) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<OrgSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.length < 2) {
      setResults([])
      setSearched(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const excludeParam = excludeIdsString ? `&exclude=${excludeIdsString}` : ""
        const res = await fetch(`/api/dashboard/organizations/search?q=${encodeURIComponent(query)}${excludeParam}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.organizations)
        }
      } catch {
        setResults([])
      } finally {
        setLoading(false)
        setSearched(true)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, excludeIdsString])

  return { query, setQuery, results, loading, searched }
}

export function SponsorsEditForm({ hackathonId, initialSponsors, onSaveAndNext }: SponsorsEditFormProps) {
  const router = useRouter()
  const { closeDrawer } = useEdit()
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tempIdCounter = useRef(0)

  const currentSponsors = useMemo(() => {
    let sponsors = [...initialSponsors]

    for (const change of pendingChanges) {
      if (change.type === "add") {
        sponsors.push(change.sponsor)
      } else if (change.type === "delete") {
        sponsors = sponsors.filter(s => s.id !== change.sponsorId)
      } else if (change.type === "tier") {
        sponsors = sponsors.map(s =>
          s.id === change.sponsorId ? { ...s, tier: change.newTier } : s
        )
      }
    }

    return sponsors
  }, [initialSponsors, pendingChanges])

  const excludeIdsString = useMemo(
    () => currentSponsors
      .map(s => s.sponsor_tenant_id)
      .filter((id): id is string => id !== null)
      .join(","),
    [currentSponsors]
  )

  const { query, setQuery, results, loading, searched } = useOrgSearch(excludeIdsString)

  const hasChanges = pendingChanges.length > 0

  function handleAddOrg(org: OrgSearchResult) {
    const tempId = `temp-${++tempIdCounter.current}`
    const newSponsor: SponsorWithTenant = {
      id: tempId,
      hackathon_id: hackathonId,
      sponsor_tenant_id: org.id,
      name: org.name,
      logo_url: org.logoUrl,
      website_url: org.websiteUrl,
      tier: "none",
      display_order: currentSponsors.length,
      created_at: new Date().toISOString(),
      tenant: {
        slug: org.slug,
        name: org.name,
        logo_url: org.logoUrl,
        logo_url_dark: null,
      },
    }

    setPendingChanges([...pendingChanges, { type: "add", sponsor: newSponsor, tempId }])
    setQuery("")
  }

  function handleAddManual() {
    if (!query.trim()) return

    const tempId = `temp-${++tempIdCounter.current}`
    const newSponsor: SponsorWithTenant = {
      id: tempId,
      hackathon_id: hackathonId,
      sponsor_tenant_id: null,
      name: query.trim(),
      logo_url: null,
      website_url: null,
      tier: "none",
      display_order: currentSponsors.length,
      created_at: new Date().toISOString(),
    }

    setPendingChanges([...pendingChanges, { type: "add", sponsor: newSponsor, tempId }])
    setQuery("")
  }

  function handleUpdateTier(sponsorId: string, newTier: SponsorTier) {
    const existingTierChangeIndex = pendingChanges.findIndex(
      c => c.type === "tier" && c.sponsorId === sponsorId
    )

    if (existingTierChangeIndex >= 0) {
      const existingChange = pendingChanges[existingTierChangeIndex] as Extract<PendingChange, { type: "tier" }>
      if (existingChange.oldTier === newTier) {
        setPendingChanges(pendingChanges.filter((_, i) => i !== existingTierChangeIndex))
      } else {
        const updated = [...pendingChanges]
        updated[existingTierChangeIndex] = { ...existingChange, newTier }
        setPendingChanges(updated)
      }
      return
    }

    const addChange = pendingChanges.find(
      c => c.type === "add" && c.tempId === sponsorId
    ) as Extract<PendingChange, { type: "add" }> | undefined

    if (addChange) {
      setPendingChanges(pendingChanges.map(c =>
        c === addChange
          ? { ...c, sponsor: { ...c.sponsor, tier: newTier } }
          : c
      ))
      return
    }

    const currentSponsor = initialSponsors.find(s => s.id === sponsorId)
    if (!currentSponsor || currentSponsor.tier === newTier) return

    setPendingChanges([...pendingChanges, {
      type: "tier",
      sponsorId,
      newTier,
      oldTier: currentSponsor.tier,
    }])
  }

  function handleDeleteSponsor(sponsorId: string) {
    const addChange = pendingChanges.find(
      c => c.type === "add" && c.tempId === sponsorId
    )

    if (addChange) {
      setPendingChanges(pendingChanges.filter(c => c !== addChange))
      return
    }

    const originalSponsor = initialSponsors.find(s => s.id === sponsorId)
    if (!originalSponsor) return

    const tierChange = pendingChanges.find(
      c => c.type === "tier" && c.sponsorId === sponsorId
    )

    const filtered = pendingChanges.filter(c => c !== tierChange)
    setPendingChanges([...filtered, { type: "delete", sponsorId, originalSponsor }])
  }

  function handleUndo(index: number) {
    setPendingChanges(pendingChanges.filter((_, i) => i !== index))
  }

  function handleUndoAll() {
    setPendingChanges([])
  }

  async function saveChanges() {
    if (!hasChanges) return true

    setSaving(true)
    setError(null)

    try {
      for (const change of pendingChanges) {
        if (change.type === "add") {
          const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/sponsors`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: change.sponsor.name,
              tier: change.sponsor.tier,
              logoUrl: change.sponsor.logo_url,
              websiteUrl: change.sponsor.website_url,
              sponsorTenantId: change.sponsor.sponsor_tenant_id,
            }),
          })
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || `Failed to add ${change.sponsor.name}`)
          }
        } else if (change.type === "delete") {
          const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/sponsors/${change.sponsorId}`, {
            method: "DELETE",
          })
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || "Failed to remove sponsor")
          }
        } else if (change.type === "tier") {
          const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/sponsors/${change.sponsorId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tier: change.newTier }),
          })
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || "Failed to update tier")
          }
        }
      }

      router.refresh()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    if (!hasChanges) {
      closeDrawer()
      return
    }

    const ok = await saveChanges()
    if (ok) closeDrawer()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      if (query.trim() && !saving) {
        handleAddManual()
      } else if (!saving) {
        saveChanges().then(ok => {
          if (ok) { if (onSaveAndNext) { onSaveAndNext() } else { closeDrawer() } }
        })
      }
    }
  }

  const showResults = query.length >= 2
  const showAddManually = showResults && searched && !loading

  function isPending(sponsorId: string) {
    return sponsorId.startsWith("temp-") || pendingChanges.some(
      c => (c.type === "delete" && c.sponsorId === sponsorId) ||
           (c.type === "tier" && c.sponsorId === sponsorId)
    )
  }

  function isDeleted(sponsorId: string) {
    return pendingChanges.some(c => c.type === "delete" && c.sponsorId === sponsorId)
  }

  return (
    <div className="space-y-6" onKeyDown={handleKeyDown}>
      <FieldGroup>
        <Field>
          <FieldLabel>Add Sponsor</FieldLabel>
          <div className="relative">
            <Input
              placeholder="Sponsor organization name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
            )}
          </div>

          {showResults && (
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto mt-2">
              {results.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => handleAddOrg(org)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                >
                  {org.logoUrl ? (
                    <OptimizedImage
                      src={org.logoUrl}
                      alt={org.name}
                      width={32}
                      height={32}
                      className="rounded-md"
                    />
                  ) : (
                    <div className="size-8 rounded-md bg-muted flex items-center justify-center">
                      <Building2 className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{org.name}</p>
                    {org.slug && (
                      <p className="text-xs text-muted-foreground">@{org.slug}</p>
                    )}
                  </div>
                </button>
              ))}

              {showAddManually && (
                <button
                  type="button"
                  onClick={handleAddManual}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="size-8 rounded-md bg-muted flex items-center justify-center">
                    <Plus className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">Add &quot;{query}&quot; manually</p>
                    <p className="text-xs text-muted-foreground">Not on the platform</p>
                  </div>
                </button>
              )}
            </div>
          )}
        </Field>

        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}
      </FieldGroup>

      {currentSponsors.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Sponsors ({currentSponsors.length})</h4>
            {hasChanges && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUndoAll}
                className="h-7 text-xs"
              >
                <Undo2 className="size-3 mr-1" />
                Undo all
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {currentSponsors.map((sponsor) => {
              const pending = isPending(sponsor.id)
              const deleted = isDeleted(sponsor.id)

              return (
                <div
                  key={sponsor.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${
                    pending ? "border-dashed bg-muted/30" : ""
                  } ${deleted ? "opacity-50" : ""}`}
                >
                  {sponsor.logo_url ? (
                    <OptimizedImage
                      src={sponsor.logo_url}
                      alt={sponsor.name}
                      width={32}
                      height={32}
                      className="rounded-md shrink-0"
                    />
                  ) : (
                    <div className="size-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Building2 className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {sponsor.tenant?.slug ? (
                        <Link
                          href={`/o/${sponsor.tenant.slug}`}
                          className="font-medium truncate text-sm hover:underline inline-flex items-center gap-1"
                          target="_blank"
                        >
                          {sponsor.name}
                          <ExternalLink className="size-3 text-muted-foreground" />
                        </Link>
                      ) : (
                        <span className="font-medium truncate text-sm">{sponsor.name}</span>
                      )}
                      {sponsor.sponsor_tenant_id && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Linked
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Select
                    value={sponsor.tier}
                    onValueChange={(v) => handleUpdateTier(sponsor.id, v as SponsorTier)}
                    disabled={deleted}
                  >
                    <SelectTrigger className="w-24 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Tier</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                      <SelectItem value="bronze">Bronze</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSponsor(sponsor.id)}
                    disabled={deleted}
                    className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {hasChanges && (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <h4 className="text-xs font-medium text-muted-foreground">
            Pending changes ({pendingChanges.length})
          </h4>
          <div className="space-y-1">
            {pendingChanges.map((change, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {change.type === "add" && `+ Add "${change.sponsor.name}"`}
                  {change.type === "delete" && `- Remove "${change.originalSponsor.name}"`}
                  {change.type === "tier" && `~ Change tier to ${change.newTier}`}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUndo(index)}
                  className="h-6 w-6 p-0"
                >
                  <Undo2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 pt-2">
        <div className="flex gap-2">
          {hasChanges ? (
            <>
              <Button type="button" variant="outline" onClick={() => { handleUndoAll(); closeDrawer() }}>
                Discard
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
                Save changes
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Done
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <KbdGroup><Kbd>⌘</Kbd><Kbd>↵</Kbd></KbdGroup> save & next
          </span>
        </div>
      </div>
    </div>
  )
}
