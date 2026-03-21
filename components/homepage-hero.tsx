"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Globe, Plus, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CreateHackathonDialog } from "@/components/hackathon/create-hackathon-dialog"

type CreateMethod = "scratch" | "external"

export function HomepageHero() {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<CreateMethod>("scratch")

  function handleCreate(method: CreateMethod) {
    setSelectedMethod(method)
    setDialogOpen(true)
  }

  function handleAuthRequired() {
    setDialogOpen(false)
    router.push(`/sign-up?redirect_url=${encodeURIComponent("/home")}`)
  }

  return (
    <section className="flex min-h-[85vh] flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Run your hackathon from start to finish
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">
          Registration, teams, submissions, judging, and results — all in one place.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            className="h-auto flex-col items-start gap-1.5 py-4 px-6 sm:min-w-[220px]"
            onClick={() => handleCreate("scratch")}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Plus className="size-4" />
              Create from scratch
            </span>
            <span className="text-xs opacity-80">
              Start blank and add details as you go
            </span>
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-auto flex-col items-start gap-1.5 py-4 px-6 sm:min-w-[220px]"
            onClick={() => handleCreate("external")}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Globe className="size-4" />
              Import an external event
            </span>
            <span className="text-xs text-muted-foreground">
              Import from Luma, Eventbrite, or any event page
            </span>
          </Button>
        </div>

        <div className="mt-12 rounded-lg border bg-muted/50 px-4 py-3">
          <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
            <Terminal className="size-4 shrink-0" />
            <span>Manage hackathons from</span>
            <span className="font-medium text-foreground">Claude Code</span>
            <span>,</span>
            <span className="font-medium text-foreground">Open Claw</span>
            <span>, or any AI agent —</span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
              npx skills add AGI-Ventures-Canada/oatmeal
            </code>
          </p>
        </div>
      </div>

      <CreateHackathonDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialMethod={selectedMethod}
        onAuthRequired={handleAuthRequired}
      />
    </section>
  )
}
