"use client"

import { useState } from "react"
import { BannerUpload } from "@/components/hackathon/banner-upload"

const DEFAULT_BANNER_URL = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"

export function DraftBannerPreview() {
  const [bannerUrl, setBannerUrl] = useState<string | null>(DEFAULT_BANNER_URL)

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Draft Banner Preview</h1>
          <p className="text-sm text-muted-foreground">
            Verifies draft-mode banner behavior without requiring an existing hackathon.
          </p>
          <p className="text-xs text-muted-foreground">
            Banner state: {bannerUrl ? "present" : "empty"}
          </p>
        </div>

        <BannerUpload
          hackathonId="draft"
          currentBannerUrl={bannerUrl}
          mode="draft"
          variant="hero"
          onUploadComplete={setBannerUrl}
        />
      </div>
    </main>
  )
}
