"use client"

import Link from "next/link"
import { Pencil, Settings, Scale } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEdit } from "./edit-context"

interface FloatingActionBarProps {
  hackathonId: string
  isOrganizer: boolean
  isJudge: boolean
  hasJudgeAssignments: boolean
}

export function FloatingActionBar({
  hackathonId,
  isOrganizer,
  isJudge,
  hasJudgeAssignments,
}: FloatingActionBarProps) {
  const { editMode, setEditMode } = useEdit()

  const showJudging = isJudge && hasJudgeAssignments
  const showEdit = isOrganizer
  const showManage = isOrganizer

  if (!showJudging && !showEdit && !showManage) return null

  function scrollToAssignments() {
    const el = document.getElementById("judge-assignments")
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-full shadow-lg border bg-background/95 backdrop-blur px-2 py-1.5">
      {showJudging && (
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full"
          onClick={scrollToAssignments}
        >
          <Scale className="size-4" />
          Start Judging
        </Button>
      )}
      {showEdit && (
        <Button
          variant={editMode ? "default" : "ghost"}
          size="sm"
          className="rounded-full"
          onClick={() => setEditMode(!editMode)}
        >
          <Pencil className="size-4" />
          {editMode ? "Exit Edit" : "Edit"}
        </Button>
      )}
      {showManage && (
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full"
          asChild
        >
          <Link href={`/hackathons/${hackathonId}`}>
            <Settings className="size-4" />
            Manage
          </Link>
        </Button>
      )}
    </div>
  )
}
