"use client"

import { useState } from "react"
import { ChevronDown, Loader2 } from "lucide-react"

type PersonaInfo = {
  key: string
  name: string
  role: string | null
}

export function DevToolbarClient({
  currentPersona,
  allPersonas,
}: {
  currentPersona: PersonaInfo | null
  allPersonas: PersonaInfo[]
}) {
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)

  const others = allPersonas.filter((p) => p.key !== currentPersona?.key)

  async function switchTo(persona: PersonaInfo) {
    setSwitching(persona.key)
    setOpen(false)

    try {
      const res = await fetch("/api/admin/scenario-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona: persona.key, redirect: "/" }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        console.error("[dev-toolbar] switch-user failed:", data?.error)
        setSwitching(null)
        return
      }

      const { loginUrl } = await res.json()
      window.location.assign(loginUrl)
    } catch (err) {
      console.error("[dev-toolbar] switch-user error:", err)
      setSwitching(null)
    }
  }

  if (!currentPersona && others.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col-reverse items-end gap-1.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium shadow-md hover:bg-muted"
      >
        {switching ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {(currentPersona?.name ?? "?")[0]}
          </span>
        )}
        <span className="text-muted-foreground">
          {switching
            ? "Switching…"
            : currentPersona
              ? `${currentPersona.name}`
              : "Test user"}
        </span>
        <ChevronDown className="size-3 text-muted-foreground" />
      </button>

      {open && others.length > 0 && (
        <div className="min-w-[200px] rounded-md border bg-background py-1 shadow-lg">
          <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Switch to
          </p>
          {others.map((p) => (
            <button
              key={p.key}
              onClick={() => switchTo(p)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted"
            >
              <span className="flex size-4 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                {p.name[0]}
              </span>
              <span className="flex-1">{p.name}</span>
              {p.role && (
                <span className="text-[10px] text-muted-foreground capitalize">{p.role}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
