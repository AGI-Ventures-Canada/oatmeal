"use client"

import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEdit } from "./edit-context"

interface FloatingActionBarProps {
  isOrganizer: boolean
}

export function FloatingActionBar({ isOrganizer }: FloatingActionBarProps) {
  const { editMode, setEditMode } = useEdit()

  if (!isOrganizer) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-full shadow-xl bg-background backdrop-blur">
      <Button
        variant={editMode ? "default" : "outline"}
        className="rounded-full px-4 py-2"
        onClick={() => setEditMode(!editMode)}
      >
        <Pencil className="size-4" />
        {editMode ? "Exit Edit" : "Edit Page"}
      </Button>
    </div>
  )
}
