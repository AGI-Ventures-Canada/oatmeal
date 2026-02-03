"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface SettingsFormProps {
  hackathonId: string
  initialData: {
    name: string
    description: string | null
    rules: string | null
    bannerUrl: string | null
    startsAt: string | null
    endsAt: string | null
    registrationOpensAt: string | null
    registrationClosesAt: string | null
  }
}

function formatDateForInput(dateString: string | null): string {
  if (!dateString) return ""
  const date = new Date(dateString)
  return date.toISOString().slice(0, 16)
}

export function SettingsForm({ hackathonId, initialData }: SettingsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string || null,
      rules: formData.get("rules") as string || null,
      bannerUrl: formData.get("bannerUrl") as string || null,
      startsAt: formData.get("startsAt") as string || null,
      endsAt: formData.get("endsAt") as string || null,
      registrationOpensAt: formData.get("registrationOpensAt") as string || null,
      registrationClosesAt: formData.get("registrationClosesAt") as string || null,
    }

    try {
      const response = await fetch(`/api/dashboard/hackathons/${hackathonId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update settings")
      }

      setSuccess(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={initialData.name}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={initialData.description ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rules">Rules</Label>
        <Textarea
          id="rules"
          name="rules"
          rows={4}
          defaultValue={initialData.rules ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bannerUrl">Banner Image URL</Label>
        <Input
          id="bannerUrl"
          name="bannerUrl"
          type="url"
          placeholder="https://..."
          defaultValue={initialData.bannerUrl ?? ""}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="registrationOpensAt">Registration Opens</Label>
          <Input
            id="registrationOpensAt"
            name="registrationOpensAt"
            type="datetime-local"
            defaultValue={formatDateForInput(initialData.registrationOpensAt)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="registrationClosesAt">Registration Closes</Label>
          <Input
            id="registrationClosesAt"
            name="registrationClosesAt"
            type="datetime-local"
            defaultValue={formatDateForInput(initialData.registrationClosesAt)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startsAt">Hackathon Starts</Label>
          <Input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={formatDateForInput(initialData.startsAt)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endsAt">Hackathon Ends</Label>
          <Input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            defaultValue={formatDateForInput(initialData.endsAt)}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {success && (
        <p className="text-sm text-primary">Settings saved successfully!</p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  )
}
