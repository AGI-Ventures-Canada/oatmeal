"use client"

import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useEdit } from "./edit-context"

export function EditModeToggle() {
  const { isEditable, editMode, setEditMode } = useEdit()

  if (!isEditable) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant={editMode ? "default" : "secondary"}
            className="fixed bottom-6 right-6 z-50 size-10 rounded-full shadow-lg"
            onClick={() => setEditMode(!editMode)}
          >
            <Pencil className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          {editMode ? "Exit edit mode" : "Edit this page"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
