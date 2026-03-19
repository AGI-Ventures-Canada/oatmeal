"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CreateHackathonDialog } from "@/components/hackathon/create-hackathon-dialog"

export function CreateHackathonDialogPreview() {
  const [open, setOpen] = useState(true)

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            Open Create Hackathon Dialog
          </Button>
        </div>

        <div className="rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
          Development preview for the create hackathon flow.
        </div>
      </div>

      <CreateHackathonDialog open={open} onOpenChange={setOpen} />
    </main>
  )
}
