"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field"
import { useEdit } from "@/components/hackathon/preview/edit-context"
import { BannerUpload } from "@/components/hackathon/banner-upload"

interface HeroEditFormProps {
  hackathonId: string
  initialData: {
    name: string
    bannerUrl: string | null
  }
}

export function HeroEditForm({ hackathonId, initialData }: HeroEditFormProps) {
  const router = useRouter()
  const { closeDrawer } = useEdit()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(initialData.name)
  const [bannerUrl, setBannerUrl] = useState(initialData.bannerUrl)

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && name.trim() && !saving) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/dashboard/hackathons/${hackathonId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save")
      }

      router.refresh()
      closeDrawer()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6" autoComplete="off">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="hero-name">Hackathon Name</FieldLabel>
          <Input
            id="hero-name"
            name="hackathon-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
          />
        </Field>

        <Field>
          <FieldLabel>Banner Image</FieldLabel>
          <BannerUpload
            hackathonId={hackathonId}
            currentBannerUrl={bannerUrl}
            onUploadComplete={(url) => setBannerUrl(url || null)}
          />
          <FieldDescription>
            Recommended size: 1920x480px. Drag to reposition after uploading.
          </FieldDescription>
        </Field>

        {error && (
          <p className="text-destructive text-sm">{error}</p>
        )}
      </FieldGroup>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving || !name.trim()}>
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={closeDrawer} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
