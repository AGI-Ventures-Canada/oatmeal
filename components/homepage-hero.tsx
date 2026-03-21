"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Copy, Globe, Plus, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CreateHackathonDialog } from "@/components/hackathon/create-hackathon-dialog"

const INSTALL_COMMAND = "npx skills add AGI-Ventures-Canada/oatmeal"

export function HomepageHero() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(INSTALL_COMMAND)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
          <Button size="hero" asChild>
            <Link href="/create">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Plus className="size-4" />
                Create from scratch
              </span>
              <span className="text-xs text-primary-foreground/80">
                Start blank and add details as you go
              </span>
            </Link>
          </Button>

          <Button
            size="hero"
            variant="outline"
            onClick={() => setDialogOpen(true)}
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

        <div className="mt-12 space-y-2">
          <p className="text-sm text-muted-foreground">
            Or manage hackathons from your AI agent
          </p>
          <div className="mx-auto flex max-w-sm items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 font-mono text-sm">
            <Terminal className="size-3.5 shrink-0 text-muted-foreground" />
            <code className="min-w-0 flex-1 truncate text-left">
              {INSTALL_COMMAND}
            </code>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleCopy}
              aria-label={copied ? "Copied" : "Copy install command"}
            >
              {copied ? (
                <Check className="size-3" />
              ) : (
                <Copy className="size-3" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <CreateHackathonDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialMethod="external"
      />
    </section>
  )
}
