"use client"

import { useState, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { useEdit } from "@/components/hackathon/preview/edit-context"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Trash2, Loader2, Check, ChevronsUpDown, Trophy, Heart, Star, BarChart3 } from "lucide-react"
import type { PrizeType, JudgingCriteria, JudgingMode } from "@/lib/db/hackathon-types"
import type { PublicPrize } from "@/lib/services/public-hackathons"
import { formatCurrency } from "@/lib/utils/currency"

type Prize = PublicPrize & {
  monetary_value?: number | null
  currency?: string | null
  distribution_method?: string | null
}
import { cn } from "@/lib/utils"

interface PrizesEditFormProps {
  hackathonId: string
  initialPrizes: Prize[]
  criteria?: JudgingCriteria[]
  judgingMode?: JudgingMode
  onSaveAndNext?: () => void
  onSave?: (data: { prizes: { name: string; description: string | null; value: string | null }[] }) => Promise<boolean>
}

type PresetContext = {
  currentPrizes: Prize[]
  criteria: JudgingCriteria[]
  judgingMode: JudgingMode
}

type PresetPrize = {
  name: string
  type: PrizeType
  rank: number | null
  kind: string
  criteria_id: string | null
}

type PresetDef = {
  id: string
  label: string | ((ctx: PresetContext) => string)
  description: string | ((ctx: PresetContext) => string)
  icon: React.ComponentType<{ className?: string }>
  prizes: (ctx: PresetContext) => PresetPrize[]
}

const STATIC_PRESETS: PresetDef[] = [
  {
    id: "podium",
    label: "1st, 2nd, 3rd Place",
    description:
      "Creates three prizes awarded to the highest-scoring submissions based on overall judge scores.",
    icon: Trophy,
    prizes: ({ currentPrizes }) => {
      const existingRanks = new Set(
        currentPrizes
          .filter((p) => p.type === "score" && p.rank != null)
          .map((p) => p.rank!)
      )
      const podium = [
        { rank: 1, name: "1st Place" },
        { rank: 2, name: "2nd Place" },
        { rank: 3, name: "3rd Place" },
      ]
      return podium
        .filter((p) => !existingRanks.has(p.rank))
        .map((p) => ({
          name: p.name,
          type: "score" as PrizeType,
          rank: p.rank,
          kind: "cash",
          criteria_id: null,
        }))
    },
  },
  {
    id: "audience",
    label: "Audience Favorite",
    description:
      "One prize decided by audience voting. Participants and spectators vote for their favorite.",
    icon: Heart,
    prizes: ({ currentPrizes }) => {
      const hasCrowd = currentPrizes.some((p) => p.type === "crowd")
      if (hasCrowd) return []
      return [
        {
          name: "Audience Favorite",
          type: "crowd" as PrizeType,
          rank: null,
          kind: "other",
          criteria_id: null,
        },
      ]
    },
  },
  {
    id: "judges-choice",
    label: (ctx) =>
      ctx.judgingMode === "subjective" ? "Judge's Choice" : "Organizer's Pick",
    description: (ctx) =>
      ctx.judgingMode === "subjective"
        ? "Judges vote for their top pick — most votes wins."
        : "One prize where you hand-pick the winner.",
    icon: Star,
    prizes: ({ currentPrizes }) => {
      const hasFavorite = currentPrizes.some((p) => p.type === "favorite")
      if (hasFavorite) return []
      return [
        {
          name: "Judge's Choice",
          type: "favorite" as PrizeType,
          rank: null,
          kind: "other",
          criteria_id: null,
        },
      ]
    },
  },
]

function getCriteriaPresets(criteria: JudgingCriteria[]): PresetDef[] {
  return criteria.map((c) => ({
    id: `criteria-${c.id}`,
    label: `Best in ${c.name}`,
    description: `Awarded to the submission with the highest score in ${c.name}.`,
    icon: BarChart3,
    prizes: ({ currentPrizes }) => {
      const exists = currentPrizes.some(
        (p) => p.type === "criteria" && p.criteria_id === c.id
      )
      if (exists) return []
      return [
        {
          name: `Best in ${c.name}`,
          type: "criteria" as PrizeType,
          rank: null,
          kind: "other",
          criteria_id: c.id,
        },
      ]
    },
  }))
}

const KIND_PRESETS = [
  { value: "cash", label: "Cash" },
  { value: "credit", label: "Credit" },
  { value: "swag", label: "Swag" },
  { value: "experience", label: "Experience" },
  { value: "other", label: "Other" },
]

function getTypeInfo(type: PrizeType, judgingMode?: JudgingMode, criterionName?: string): string {
  switch (type) {
    case "score":
      return "Awarded to rank #N based on overall judging scores"
    case "criteria":
      return criterionName
        ? `Awarded to highest score in ${criterionName}`
        : "Awarded to highest score in a specific criterion"
    case "favorite":
      return judgingMode === "subjective"
        ? "Judges vote for their pick — most-picked wins"
        : "You'll manually select the winner"
    case "crowd":
      return "Determined by audience votes"
    default:
      return ""
  }
}

export function PrizesEditForm({
  hackathonId,
  initialPrizes,
  criteria = [],
  judgingMode = "points",
  onSaveAndNext,
  onSave,
}: PrizesEditFormProps) {
  const isLocalMode = !!onSave
  const router = useRouter()
  const { closeDrawer } = useEdit()
  const [prizes, setPrizes] = useState<Prize[]>(initialPrizes)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSaved, setShowSaved] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const tempIdCounter = useRef(0)

  function flashSaved() {
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  async function saveLocalMode(updatedPrizes: Prize[]) {
    if (!onSave) return false
    const prizesData = updatedPrizes.map((p) => ({
      name: p.name,
      description: p.description,
      value: p.value,
    }))
    const ok = await onSave({ prizes: prizesData })
    if (ok) flashSaved()
    return ok
  }

  async function handleAddPrize() {
    if (!nameInput.trim()) return

    const newPrize: Prize = {
      id: `temp-${++tempIdCounter.current}`,
      hackathon_id: hackathonId,
      name: nameInput.trim(),
      description: null,
      value: null,
      type: "favorite",
      rank: null,
      kind: "other",
      monetary_value: null,
      currency: "USD",
      distribution_method: null,
      display_value: null,
      criteria_id: null,
      prize_track_id: null,
      judging_style: null,
      round_id: null,
      assignment_mode: null,
      max_picks: null,
      display_order: prizes.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (isLocalMode) {
      const updated = [...prizes, newPrize]
      setPrizes(updated)
      setNameInput("")
      await saveLocalMode(updated)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/prizes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPrize.name,
          type: newPrize.type,
          kind: newPrize.kind,
          displayOrder: newPrize.display_order,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to add prize")
      }
      const created = await res.json()
      setPrizes([...prizes, { ...newPrize, id: created.id ?? newPrize.id }])
      setNameInput("")
      router.refresh()
      flashSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add prize")
    } finally {
      setSaving(false)
    }
  }

  const presetCtx: PresetContext = useMemo(
    () => ({ currentPrizes: prizes, criteria, judgingMode }),
    [prizes, criteria, judgingMode]
  )

  const allPresets = useMemo(
    () => [...STATIC_PRESETS, ...getCriteriaPresets(criteria)],
    [criteria]
  )

  async function handleAddPreset(preset: PresetDef) {
    const presetPrizes = preset.prizes(presetCtx)
    if (presetPrizes.length === 0) return

    const newPrizes: Prize[] = presetPrizes.map((p) => ({
      id: `temp-${++tempIdCounter.current}`,
      hackathon_id: hackathonId,
      name: p.name,
      description: null,
      value: null,
      type: p.type,
      rank: p.rank,
      kind: p.kind,
      monetary_value: null,
      currency: "USD",
      distribution_method: null,
      display_value: null,
      criteria_id: p.criteria_id,
      prize_track_id: null,
      judging_style: null,
      round_id: null,
      assignment_mode: null,
      max_picks: null,
      display_order: prizes.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    if (isLocalMode) {
      const updated = [...prizes, ...newPrizes]
      setPrizes(updated)
      await saveLocalMode(updated)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const created: Prize[] = []
      for (const prize of newPrizes) {
        const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/prizes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: prize.name,
            type: prize.type,
            rank: prize.rank,
            kind: prize.kind,
            criteriaId: prize.criteria_id,
            displayOrder: prize.display_order,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || `Failed to add ${prize.name}`)
        }
        const data = await res.json()
        created.push({ ...prize, id: data.id ?? prize.id })
      }
      setPrizes([...prizes, ...created])
      router.refresh()
      flashSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add prizes")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeletePrize(prizeId: string) {
    const prizeToDelete = prizes.find((p) => p.id === prizeId)
    if (!prizeToDelete) return

    const updated = prizes.filter((p) => p.id !== prizeId)
    setPrizes(updated)

    if (isLocalMode) {
      await saveLocalMode(updated)
      return
    }

    if (prizeId.startsWith("temp-")) {
      flashSaved()
      return
    }

    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/prizes/${prizeId}`,
        { method: "DELETE" }
      )
      if (!res.ok) {
        setPrizes((prev) => [...prev, prizeToDelete])
        const data = await res.json()
        throw new Error(data.error || "Failed to remove prize")
      }
      router.refresh()
      flashSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove prize")
    }
  }

  function handleFieldChange(prizeId: string, field: string, value: unknown) {
    setPrizes((prev) =>
      prev.map((p) => (p.id === prizeId ? { ...p, [field]: value } : p))
    )
  }

  async function handleFieldBlur(prizeId: string) {
    const prize = prizes.find((p) => p.id === prizeId)
    if (!prize) return

    if (isLocalMode) {
      await saveLocalMode(prizes)
      return
    }

    if (prizeId.startsWith("temp-")) return

    const original = initialPrizes.find((p) => p.id === prizeId)
    if (!original) return

    const changed =
      prize.name !== original.name ||
      prize.description !== original.description ||
      prize.display_value !== original.display_value ||
      prize.monetary_value !== original.monetary_value ||
      prize.currency !== original.currency ||
      prize.distribution_method !== original.distribution_method ||
      prize.type !== original.type ||
      prize.rank !== original.rank ||
      prize.kind !== original.kind ||
      prize.criteria_id !== original.criteria_id

    if (!changed) return

    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/prizes/${prizeId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: prize.name,
            description: prize.description,
            displayValue: prize.display_value,
            monetaryValue: prize.monetary_value,
            currency: prize.currency,
            distributionMethod: prize.distribution_method,
            type: prize.type,
            rank: prize.rank,
            kind: prize.kind,
            criteriaId: prize.criteria_id,
          }),
        }
      )
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update prize")
      }
      router.refresh()
      flashSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update prize")
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      if (nameInput.trim() && !saving) {
        handleAddPrize()
      } else if (!saving) {
        if (onSaveAndNext) {
          onSaveAndNext()
        } else {
          closeDrawer()
        }
      }
    }
  }

  return (
    <div className="space-y-6" onKeyDown={handleKeyDown}>
      <FieldGroup>
        <Field>
          <FieldLabel>Quick Add</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {allPresets.map((preset) => {
              const remaining = preset.prizes(presetCtx)
              const fullyUsed = remaining.length === 0
              const label =
                typeof preset.label === "function"
                  ? preset.label(presetCtx)
                  : preset.label
              const description =
                typeof preset.description === "function"
                  ? preset.description(presetCtx)
                  : preset.description
              const Icon = preset.icon

              return (
                <HoverCard key={preset.id} openDelay={300}>
                  <HoverCardTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={fullyUsed || saving}
                      onClick={() => handleAddPreset(preset)}
                    >
                      {fullyUsed ? (
                        <Check className="size-3 mr-1" />
                      ) : (
                        <Icon className="size-3 mr-1" />
                      )}
                      {label}
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent side="bottom" align="start">
                    {description}
                  </HoverCardContent>
                </HoverCard>
              )
            })}
          </div>
        </Field>

        <Field>
          <FieldLabel>Or add manually</FieldLabel>
          <Input
            placeholder="Prize name..."
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && nameInput.trim()) {
                e.preventDefault()
                handleAddPrize()
              }
            }}
            autoFocus
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Press Enter to add
          </p>
        </Field>

        {error && <p className="text-destructive text-sm">{error}</p>}
      </FieldGroup>

      {prizes.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">
            Prizes ({prizes.length})
          </h4>
          <div className="space-y-2">
            {prizes.map((prize) => {
              const criterionName = prize.criteria_id
                ? criteria.find((c) => c.id === prize.criteria_id)?.name
                : undefined

              return (
                <div
                  key={prize.id}
                  className={`rounded-lg border p-3 space-y-3 ${
                    prize.id.startsWith("temp-") ? "border-dashed bg-muted/30" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <Input
                        value={prize.name}
                        onChange={(e) => handleFieldChange(prize.id, "name", e.target.value)}
                        onBlur={() => handleFieldBlur(prize.id)}
                        placeholder="Prize name"
                        className="h-8 text-sm font-medium"
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                        data-form-type="other"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePrize(prize.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 shrink-0"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  <Textarea
                    value={prize.description ?? ""}
                    onChange={(e) => handleFieldChange(prize.id, "description", e.target.value)}
                    onBlur={() => handleFieldBlur(prize.id)}
                    placeholder="Description"
                    rows={2}
                    className="text-sm resize-none"
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                  />

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">What&apos;s the prize?</p>
                    <KindCombobox
                      value={prize.kind}
                      onChange={(v) => {
                        handleFieldChange(prize.id, "kind", v)
                        setTimeout(() => handleFieldBlur(prize.id), 0)
                      }}
                    />
                    <Input
                      value={prize.display_value ?? ""}
                      onChange={(e) => handleFieldChange(prize.id, "display_value", e.target.value)}
                      onBlur={(e) => {
                        const formatted = formatCurrency(e.target.value)
                        if (formatted !== e.target.value) {
                          handleFieldChange(prize.id, "display_value", formatted)
                        }
                        handleFieldBlur(prize.id)
                      }}
                      placeholder='e.g. 5000'
                      className="h-8 text-sm"
                      autoComplete="off"
                      data-1p-ignore
                      data-lpignore="true"
                      data-form-type="other"
                    />
                    {(prize.kind === "cash" || prize.kind === "credit") && (
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          value={prize.monetary_value ?? ""}
                          onChange={(e) =>
                            handleFieldChange(
                              prize.id,
                              "monetary_value",
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                          onBlur={() => handleFieldBlur(prize.id)}
                          placeholder="Amount"
                          className="h-8 text-sm"
                          autoComplete="off"
                          data-1p-ignore
                          data-lpignore="true"
                          data-form-type="other"
                        />
                        <Input
                          value={prize.currency ?? "USD"}
                          onChange={(e) => handleFieldChange(prize.id, "currency", e.target.value)}
                          onBlur={() => handleFieldBlur(prize.id)}
                          placeholder="Currency (e.g. USD)"
                          className="h-8 text-sm"
                          autoComplete="off"
                          data-1p-ignore
                          data-lpignore="true"
                          data-form-type="other"
                        />
                      </div>
                    )}
                    <div>
                      <Input
                        value={prize.distribution_method ?? ""}
                        onChange={(e) => handleFieldChange(prize.id, "distribution_method", e.target.value)}
                        onBlur={() => handleFieldBlur(prize.id)}
                        placeholder="Distribution note (e.g. Wire to captain)"
                        className="h-8 text-sm"
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                        data-form-type="other"
                      />
                      <p className="text-xs text-muted-foreground mt-0.5">Not shown to participants</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">How is the winner decided?</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select
                        value={prize.type}
                        onValueChange={(v) => {
                          handleFieldChange(prize.id, "type", v as PrizeType)
                          if (v !== "score") handleFieldChange(prize.id, "rank", null)
                          if (v !== "criteria") handleFieldChange(prize.id, "criteria_id", null)
                          setTimeout(() => handleFieldBlur(prize.id), 0)
                        }}
                      >
                        <SelectTrigger className="w-44 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="score">Score-based</SelectItem>
                          <SelectItem value="criteria">Best in Category</SelectItem>
                          <SelectItem value="favorite">
                            {judgingMode === "subjective" ? "Judge's Choice" : "Organizer's Pick"}
                          </SelectItem>
                          <SelectItem value="crowd">Crowd&apos;s Favorite</SelectItem>
                        </SelectContent>
                      </Select>
                      {prize.type === "score" && (
                        <Select
                          value={prize.rank?.toString() ?? "1"}
                          onValueChange={(v) => {
                            handleFieldChange(prize.id, "rank", parseInt(v))
                            setTimeout(() => handleFieldBlur(prize.id), 0)
                          }}
                        >
                          <SelectTrigger className="w-20 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1st</SelectItem>
                            <SelectItem value="2">2nd</SelectItem>
                            <SelectItem value="3">3rd</SelectItem>
                            <SelectItem value="4">4th</SelectItem>
                            <SelectItem value="5">5th</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {prize.type === "criteria" && criteria.length > 0 && (
                        <Select
                          value={prize.criteria_id ?? ""}
                          onValueChange={(v) => {
                            handleFieldChange(prize.id, "criteria_id", v || null)
                            setTimeout(() => handleFieldBlur(prize.id), 0)
                          }}
                        >
                          <SelectTrigger className="w-44 h-8 text-xs">
                            <SelectValue placeholder="Select criterion" />
                          </SelectTrigger>
                          <SelectContent>
                            {criteria.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {getTypeInfo(prize.type, judgingMode, criterionName)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <KbdGroup>
              <Kbd>&#x2318;</Kbd>
              <Kbd>&#x21B5;</Kbd>
            </KbdGroup>{" "}
            save & next
          </span>
        </div>
        {saving && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" />
            Saving...
          </p>
        )}
        {showSaved && (
          <p className="text-xs text-muted-foreground animate-in fade-in">Saved</p>
        )}
      </div>
    </div>
  )
}

function KindCombobox({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const selectedLabel = KIND_PRESETS.find((k) => k.value === value)?.label ?? value

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between h-8 text-xs"
        >
          {selectedLabel || "Select kind..."}
          <ChevronsUpDown className="ml-2 size-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or type custom..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {search.trim() ? (
                <button
                  type="button"
                  className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent"
                  onClick={() => {
                    onChange(search.trim().toLowerCase())
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  Use &quot;{search.trim()}&quot;
                </button>
              ) : (
                "No results"
              )}
            </CommandEmpty>
            <CommandGroup>
              {KIND_PRESETS.map((kind) => (
                <CommandItem
                  key={kind.value}
                  value={kind.value}
                  onSelect={(v) => {
                    onChange(v)
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-3",
                      value === kind.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {kind.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
