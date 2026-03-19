"use client"

import { EventImportEditor } from "@/components/hackathon/event-import-editor"
import type { LumaEventData } from "@/lib/services/luma-import"
import type { LumaRichContent } from "@/lib/services/luma-extract"

const STORAGE_KEY = "oatmeal:luma-import"

type LumaImportEditorProps = {
  eventData: LumaEventData
  richContent: LumaRichContent | null
  lumaSlug: string
}

export function LumaImportEditor({ eventData, richContent, lumaSlug }: LumaImportEditorProps) {
  return (
    <EventImportEditor
      eventData={eventData}
      richContent={richContent}
      sourceUrl={`https://luma.com/${lumaSlug}`}
      storageKey={STORAGE_KEY}
      submitPath="/api/dashboard/import/luma"
    />
  )
}
