"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, Copy, Plus, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"

const INSTALL_COMMAND = "npx skills add AGI-Ventures-Canada/oatmeal"

export function HomepageHero() {
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

        <div className="mt-10 flex justify-center">
          <Button size="lg" asChild>
            <Link href="/create">
              <Plus className="size-4" />
              Create event
            </Link>
          </Button>
        </div>

        <div className="mt-12 space-y-2">
          <p className="text-sm text-muted-foreground">
            Or manage hackathons from your AI agent
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            className="mx-auto flex h-auto max-w-sm items-center gap-2 px-3 py-2 font-mono text-sm"
          >
            <Terminal className="size-3.5 shrink-0 text-muted-foreground" />
            <code className="min-w-0 flex-1 truncate text-left">
              {copied ? "Copied!" : INSTALL_COMMAND}
            </code>
            <span className="shrink-0 text-muted-foreground">
              {copied ? (
                <Check className="size-3" />
              ) : (
                <Copy className="size-3" />
              )}
            </span>
          </Button>
        </div>
      </div>
    </section>
  )
}
