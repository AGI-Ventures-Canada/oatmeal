"use client"

import { useCallback } from "react"
import { HackathonDraftEditor, type DraftState } from "@/components/hackathon/hackathon-draft-editor"
import type { LumaEventData } from "@/lib/services/luma-import"

const STORAGE_KEY = "oatmeal:luma-import"

type LumaImportEditorProps = {
  eventData: LumaEventData
  lumaSlug: string
}

function eventDataToState(eventData: LumaEventData): DraftState {
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
    sponsors: [],
  }
}

export function LumaImportEditor({ eventData, lumaSlug }: LumaImportEditorProps) {
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
      initialState={eventDataToState(eventData)}
      storageKey={STORAGE_KEY}
      onSubmit={handleSubmit}
      sourceLabel={`luma.com/${lumaSlug}`}
      signInDescription="Your edits have been saved. Sign in to upload images and create your hackathon."
    />
  )
}
