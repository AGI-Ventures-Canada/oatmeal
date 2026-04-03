"use client"

import { useCallback } from "react"
import { CreateFlow } from "@/components/hackathon/create-flow/create-flow"
import type { DraftState } from "@/components/hackathon/hackathon-draft-editor"

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

  const handlePatchSettings = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      const res = await fetch(`/api/dashboard/hackathons/${id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        console.error("Failed to patch settings:", await res.text())
      }
    },
    [],
  )

  return (
    <CreateFlow
      onSubmit={handleSubmit}
      onPatchSettings={handlePatchSettings}
    />
  )
}
