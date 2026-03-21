"use client"

import { useCallback } from "react"
import { HackathonDraftEditor, type DraftState } from "@/components/hackathon/hackathon-draft-editor"

const EMPTY_STATE: DraftState = {
  name: "",
  description: null,
  startsAt: null,
  endsAt: null,
  registrationOpensAt: null,
  registrationClosesAt: null,
  locationType: null,
  locationName: null,
  locationUrl: null,
  imageUrl: null,
  sponsors: [],
  rules: null,
  prizes: [],
}

export function CreateFromScratchEditor() {
  const handleSubmit = useCallback(async (state: DraftState) => {
    const res = await fetch("/api/dashboard/hackathons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: state.name,
        description: state.description,
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
      initialState={EMPTY_STATE}
      storageKey="oatmeal:create-from-scratch"
      onSubmit={handleSubmit}
      signInDescription="Your draft has been saved. Sign in to create your hackathon."
    />
  )
}
