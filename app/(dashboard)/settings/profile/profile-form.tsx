"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useClerk } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field"
import { LogoUploadModal } from "@/components/org/logo-upload-modal"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Sun, Moon, ImageIcon, ExternalLink, Users, CreditCard } from "lucide-react"

type ProfileFormProps = {
  initialData: {
    name: string
    slug: string | null
    logoUrl: string | null
    logoUrlDark: string | null
    description: string | null
    websiteUrl: string | null
  }
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const router = useRouter()
  const { openOrganizationProfile } = useClerk()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [slug, setSlug] = useState(initialData.slug ?? "")
  const [description, setDescription] = useState(initialData.description ?? "")
  const [websiteUrl, setWebsiteUrl] = useState(initialData.websiteUrl ?? "")

  async function handleSave() {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch("/api/dashboard/org-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug || null,
          description: description || null,
          websiteUrl: websiteUrl || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save profile")
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  const hasLogo = initialData.logoUrl || initialData.logoUrlDark

  return (
    <FieldGroup className="max-w-xl">
      <Field>
        <FieldLabel>Logo</FieldLabel>
        <FieldDescription>
          Upload logos for light and dark themes. Rectangular logos (2:1 ratio) work best.
        </FieldDescription>

        <div className="mt-2 flex items-start gap-4">
          {hasLogo ? (
            <div className="flex gap-3">
              {initialData.logoUrl && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Sun className="size-2.5" />
                    <span>Light</span>
                  </div>
                  <div className="bg-[#f5f5f4] border border-[#e5e5e5] p-2 flex items-center justify-center h-14 w-28">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={initialData.logoUrl}
                      alt="Light mode logo"
                      className="max-h-10 max-w-full object-contain"
                    />
                  </div>
                </div>
              )}
              {initialData.logoUrlDark && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Moon className="size-2.5" />
                    <span>Dark</span>
                  </div>
                  <div className="bg-[#1a1a1a] border border-[#333] p-2 flex items-center justify-center h-14 w-28">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={initialData.logoUrlDark}
                      alt="Dark mode logo"
                      className="max-h-10 max-w-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-muted/50 border border-dashed p-4 flex items-center justify-center h-14 w-28">
              <ImageIcon className="size-5 text-muted-foreground" />
            </div>
          )}

          <LogoUploadModal
            lightLogoUrl={initialData.logoUrl}
            darkLogoUrl={initialData.logoUrlDark}
            trigger={
              <Button variant="outline" size="sm">
                {hasLogo ? "Change Logo" : "Upload Logo"}
              </Button>
            }
          />
        </div>
      </Field>

      <Field>
        <FieldLabel>Organization Name</FieldLabel>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{initialData.name}</span>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => openOrganizationProfile()}
          >
            Edit in Clerk
            <ExternalLink className="size-3 ml-1" />
          </Button>
        </div>
        <FieldDescription>
          Name is managed through Clerk and synced automatically
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="slug">URL Slug</FieldLabel>
        <Input
          id="slug"
          type="text"
          placeholder="my-organization"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
        />
        <FieldDescription>
          Your public organization page URL: /o/{slug || "your-slug"}
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea
          id="description"
          placeholder="Tell people about your organization..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="website-url">Website URL</FieldLabel>
        <Input
          id="website-url"
          type="url"
          placeholder="https://example.com"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
        />
      </Field>

      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}

      <div className="pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </FieldGroup>
  )
}

export function ClerkSettingsCard() {
  const { openOrganizationProfile } = useClerk()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team & Billing</CardTitle>
        <CardDescription>
          Manage members, invitations, and billing through Clerk
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openOrganizationProfile({ afterLeaveOrganizationUrl: "/onboarding" })}
          >
            <Users className="size-4 mr-2" />
            Manage Members
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openOrganizationProfile()}
          >
            <CreditCard className="size-4 mr-2" />
            Billing & Plans
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
