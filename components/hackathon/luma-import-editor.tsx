"use client"

import { useCallback } from "react"
import { HackathonDraftEditor, type DraftState } from "@/components/hackathon/hackathon-draft-editor"
import type { LumaEventData } from "@/lib/services/luma-import"
import type { LumaRichContent } from "@/lib/services/luma-extract"

const STORAGE_KEY = "oatmeal:luma-import"

type LumaImportEditorProps = {
  eventData: LumaEventData
  richContent: LumaRichContent | null
  lumaSlug: string
}

function eventDataToState(
  eventData: LumaEventData,
  richContent: LumaRichContent | null
): DraftState {
  return {
    name: eventData.name,
    description: eventData.description,
    startsAt: eventData.startsAt,
    endsAt: eventData.endsAt,
    registrationOpensAt: null,
    registrationClosesAt: null,
    locationType: eventData.locationType,
    locationName: eventData.locationName,
    locationUrl: eventData.locationUrl,
    imageUrl: eventData.imageUrl,
    sponsors: richContent?.sponsors ?? [],
    rules: richContent?.rules ?? null,
    prizes: richContent?.prizes?.map((p) => ({
      name: p.name,
      description: p.description,
      value: p.value,
    })) ?? [],
  }
}

export function LumaImportEditor({ eventData, richContent, lumaSlug }: LumaImportEditorProps) {
  const handleSubmit = useCallback(async (state: DraftState) => {
    const res = await fetch("/api/dashboard/import/luma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: state.name,
        description: state.description,
        startsAt: state.startsAt,
        endsAt: state.endsAt,
        registrationOpensAt: state.registrationOpensAt,
        registrationClosesAt: state.registrationClosesAt,
        locationType: state.locationType,
        locationName: state.locationName,
        locationUrl: state.locationUrl,
        imageUrl: state.imageUrl,
        sponsors: state.sponsors,
        rules: state.rules,
        prizes: state.prizes,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || "Failed to create hackathon")
    }

    return res.json()
  }, [])

  return (
    <HackathonDraftEditor
      initialState={eventDataToState(eventData, richContent)}
      storageKey={STORAGE_KEY}
      onSubmit={handleSubmit}
      sourceLabel={`luma.com/${lumaSlug}`}
      signInDescription="Your edits have been saved. Sign in to upload images and create your hackathon."
    />
  )
}
