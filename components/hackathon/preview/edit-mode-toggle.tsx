"use client"

import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEdit } from "./edit-context"

export function EditModeToggle() {
  const { isEditable, editMode, setEditMode } = useEdit()

  if (!isEditable) return null

  return (
    <Button
      variant={editMode ? "default" : "secondary"}
      className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg"
      onClick={() => setEditMode(!editMode)}
    >
      <Pencil className="size-4" />
      {editMode ? "Exit edit mode" : "Edit page"}
    </Button>
  )
}
