"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type PersonaInfo = {
  key: string;
  name: string;
};

export function DevToolbarClient({
  currentPersonaKey,
  allPersonas,
  hackathonId,
}: {
  currentPersonaKey: string | null;
  allPersonas: PersonaInfo[];
  hackathonId: string;
}) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [personaRoles, setPersonaRoles] = useState<Record<string, string>>({});

  const currentPersona =
    allPersonas.find((p) => p.key === currentPersonaKey) ?? null;
  const others = allPersonas.filter((p) => p.key !== currentPersonaKey);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/admin/persona-roles?hackathonId=${hackathonId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.roles) setPersonaRoles(data.roles);
      })
      .catch(() => {});
  }, [open, hackathonId]);

  async function switchTo(persona: PersonaInfo) {
    setSwitching(persona.key);
    setOpen(false);

    try {
      const res = await fetch("/api/admin/scenario-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: persona.key,
          redirect: window.location.pathname,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("[dev-toolbar] switch-user failed:", data?.error);
        setSwitching(null);
        return;
      }

      const { loginUrl } = await res.json();
      window.location.assign(loginUrl);
    } catch (err) {
      console.error("[dev-toolbar] switch-user error:", err);
      setSwitching(null);
    }
  }

  if (!currentPersona && others.length === 0) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 flex flex-col-reverse items-end gap-1.5 ${open ? "z-9999" : "z-9998"}`}
    >
      <Button
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full shadow-md"
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
      </Button>

      {open && others.length > 0 && (
        <div className="w-64 rounded-md border bg-background py-1 shadow-lg">
          <p className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Switch to
          </p>
          {others.map((p) => (
            <Button
              key={p.key}
              variant="ghost"
              onClick={() => switchTo(p)}
              className="h-auto w-full justify-start gap-2 px-3 py-1.5 text-xs"
            >
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                {p.name[0]}
              </span>
              <span className="truncate text-left">{p.name}</span>
              {personaRoles[p.key] && (
                <span className="shrink-0 text-[10px] text-muted-foreground capitalize">
                  {personaRoles[p.key]}
                </span>
              )}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
