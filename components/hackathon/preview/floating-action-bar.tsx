"use client"

import { Pencil, Scale } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEdit } from "./edit-context"

interface FloatingActionBarProps {
  isOrganizer: boolean
  isJudge: boolean
  hasJudgeAssignments: boolean
}

export function FloatingActionBar({
  isOrganizer,
  isJudge,
  hasJudgeAssignments,
}: FloatingActionBarProps) {
  const { editMode, setEditMode } = useEdit()

  const showJudging = isJudge && hasJudgeAssignments
  const showEdit = isOrganizer

  if (!showJudging && !showEdit) return null

  function scrollToAssignments() {
    const el = document.getElementById("judge-assignments")
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-full shadow-xl bg-background backdrop-blur">
      {showJudging && (
        <Button
          variant="ghost"
          className="rounded-full px-4 py-2"
          onClick={scrollToAssignments}
        >
          <Scale className="size-4" />
          Start Judging
        </Button>
      )}
      {showEdit && (
        <Button
          variant={editMode ? "default" : "outline"}
          className="rounded-full px-4 py-2"
          onClick={() => setEditMode(!editMode)}
        >
          <Pencil className="size-4" />
          {editMode ? "Exit Edit" : "Edit Page"}
        </Button>
      )}
    </div>
  )
}
