"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import {
  decimalWeightToPercentage,
  getCriteriaWeightTotalPercentage,
  isBinaryWeightTotalComplete,
  percentageToDecimalWeight,
} from "@/lib/utils/judging"

type Criterion = {
  id: string
  name: string
  description: string | null
  weight: number
  displayOrder: number
  createdAt: string
}

interface CriteriaConfigProps {
  hackathonId: string
  initialCriteria: Criterion[]
}

type FormState = {
  name: string
  description: string
  weight: string
}

export function CriteriaConfig({
  hackathonId,
  initialCriteria,
}: CriteriaConfigProps) {
  const [criteria, setCriteria] = useState<Criterion[]>(initialCriteria)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    weight: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reorderingId, setReorderingId] = useState<string | null>(null)

  const totalWeightPercentage = getCriteriaWeightTotalPercentage(criteria)
  const remainingWeightPercentage = Number(
    Math.max(0, 100 - totalWeightPercentage).toFixed(2)
  )
  const hasCompleteWeightTotal = isBinaryWeightTotalComplete(totalWeightPercentage)

  function getEmptyForm(): FormState {
    return {
      name: "",
      description: "",
      weight: remainingWeightPercentage > 0 ? String(remainingWeightPercentage) : "",
    }
  }

  function openCreate() {
    setEditingId(null)
    setForm(getEmptyForm())
    setError(null)
    setSuccess(false)
    setDialogOpen(true)
  }

  function openEdit(criterion: Criterion) {
    setEditingId(criterion.id)
    setForm({
      name: criterion.name,
      description: criterion.description ?? "",
      weight: String(decimalWeightToPercentage(criterion.weight)),
    })
    setError(null)
    setSuccess(false)
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const rawWeight = parseFloat(form.weight)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      weight: percentageToDecimalWeight(rawWeight),
    }

    if (!payload.name) {
      setError("Name is required")
      setSaving(false)
      return
    }

    if (Number.isNaN(rawWeight)) {
      setError("Weight percentage is required")
      setSaving(false)
      return
    }

    if (rawWeight < 0 || rawWeight > 100) {
      setError("Weight must be between 0% and 100%")
      setSaving(false)
      return
    }

    const draftDisplayOrder =
      criteria.find((criterion) => criterion.id === editingId)?.displayOrder ?? criteria.length

    const nextCriteria = criteria
      .filter((criterion) => criterion.id !== editingId)
      .concat({
        id: editingId ?? "draft",
        name: payload.name,
        description: payload.description,
        weight: payload.weight,
        displayOrder: draftDisplayOrder,
        createdAt: new Date().toISOString(),
      })

    if (getCriteriaWeightTotalPercentage(nextCriteria) > 100.01) {
      setError("Weights cannot exceed 100%")
      setSaving(false)
      return
    }

    try {
      if (editingId) {
        const res = await fetch(
          `/api/dashboard/hackathons/${hackathonId}/judging/criteria/${editingId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        )
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to update")
        }
        setCriteria((prev) =>
          prev.map((criterion) =>
            criterion.id === editingId
              ? { ...criterion, ...payload, description: payload.description }
              : criterion
          )
        )
      } else {
        const res = await fetch(
          `/api/dashboard/hackathons/${hackathonId}/judging/criteria`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, displayOrder: criteria.length }),
          }
        )
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to create")
        }
        const data = await res.json()
        setCriteria((prev) => [
          ...prev,
          {
            id: data.id,
            name: payload.name,
            description: payload.description,
            weight: payload.weight,
            displayOrder: criteria.length,
            createdAt: new Date().toISOString(),
          },
        ])
      }
      setSuccess(true)
      setTimeout(() => setDialogOpen(false), 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(
        `/api/dashboard/hackathons/${hackathonId}/judging/criteria/${id}`,
        { method: "DELETE" }
      )
      if (!res.ok) throw new Error("Failed to delete")
      setCriteria((prev) => prev.filter((criterion) => criterion.id !== id))
    } catch {
      setError("Failed to delete criteria")
    } finally {
      setDeletingId(null)
    }
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    const idx = criteria.findIndex((criterion) => criterion.id === id)
    if (idx === -1) return
    if (direction === "up" && idx === 0) return
    if (direction === "down" && idx === criteria.length - 1) return

    setReorderingId(id)
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    const newCriteria = [...criteria]
    const temp = newCriteria[idx]
    newCriteria[idx] = newCriteria[swapIdx]
    newCriteria[swapIdx] = temp

    newCriteria[idx].displayOrder = idx
    newCriteria[swapIdx].displayOrder = swapIdx

    setCriteria(newCriteria)

    try {
      await Promise.all([
        fetch(
          `/api/dashboard/hackathons/${hackathonId}/judging/criteria/${newCriteria[idx].id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ displayOrder: idx }),
          }
        ),
        fetch(
          `/api/dashboard/hackathons/${hackathonId}/judging/criteria/${newCriteria[swapIdx].id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ displayOrder: swapIdx }),
          }
        ),
      ])
    } catch {
      setCriteria(criteria)
    } finally {
      setReorderingId(null)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !saving) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Judging Criteria</h3>
          <p className="text-sm text-muted-foreground">
            Define pass/fail criteria with percentage weights
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 size-4" />
              Add Criterion
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Criterion" : "Add Criterion"}
              </DialogTitle>
              <DialogDescription>
                Configure a pass/fail criterion and its percentage weight.
              </DialogDescription>
            </DialogHeader>
            {success ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <CheckCircle2 className="size-10 text-primary" />
                <p className="text-sm font-medium">
                  {editingId ? "Criterion updated" : "Criterion added"}
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="criteria-name">Name</Label>
                  <Input
                    id="criteria-name"
                    name="criteria-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Innovation"
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="criteria-description">Description</Label>
                  <Textarea
                    id="criteria-description"
                    name="criteria-description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="What should judges evaluate?"
                    rows={2}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="criteria-weight">Weight (%)</Label>
                  <Input
                    id="criteria-weight"
                    name="criteria-weight"
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {editingId ? "Update" : "Add"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">Weight total</p>
          <p className="text-sm text-muted-foreground">
            Judges can score only when the total is exactly 100%.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <Badge variant={hasCompleteWeightTotal ? "default" : "secondary"}>
            {totalWeightPercentage}%
          </Badge>
          {!hasCompleteWeightTotal && (
            <span className="text-sm text-muted-foreground">
              {remainingWeightPercentage > 0
                ? `${remainingWeightPercentage}% remaining`
                : "Reduce your weights to 100%"}
            </span>
          )}
        </div>
      </div>

      {criteria.length === 0 && (
        <div className="flex items-start gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="text-sm text-destructive">
            <p className="font-medium">No criteria defined</p>
            <p className="text-destructive/80">
              Judges won&apos;t be able to score submissions until you add at least one criterion.
            </p>
          </div>
        </div>
      )}

      {criteria.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No criteria defined yet. Add criteria with percentage weights to create the pass/fail rubric.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px] text-right">Weight</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {criteria.map((criterion, idx) => (
                <TableRow key={criterion.id}>
                  <TableCell className="py-1">
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        disabled={idx === 0 || reorderingId !== null}
                        onClick={() => handleReorder(criterion.id, "up")}
                      >
                        <ChevronUp className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        disabled={idx === criteria.length - 1 || reorderingId !== null}
                        onClick={() => handleReorder(criterion.id, "down")}
                      >
                        <ChevronDown className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{criterion.name}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {criterion.description || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {decimalWeightToPercentage(criterion.weight)}%
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => openEdit(criterion)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive"
                            disabled={deletingId === criterion.id}
                          >
                            {deletingId === criterion.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete &quot;{criterion.name}&quot;?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this criterion and any associated scores. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(criterion.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
