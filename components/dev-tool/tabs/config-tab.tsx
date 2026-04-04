"use client"

import { useState, useEffect } from "react"
import { Loader2, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { DevConfig } from "../use-dev-config"

type EnvStatus = {
  orgId: boolean
  devUserId: boolean
  testUsers: Record<string, boolean>
}

interface ConfigTabProps {
  config: DevConfig
  onUpdateConfig: (patch: Partial<DevConfig>) => void
  onClearConfig: () => void
}

function StatusDot({ envSet, overrideSet }: { envSet: boolean; overrideSet: boolean }) {
  if (envSet) return <span className="size-2 rounded-full bg-primary shrink-0" title="Set via env var" />
  if (overrideSet) return <span className="size-2 rounded-full bg-[oklch(0.75_0.18_55)] shrink-0" title="Set via Dev Tool" />
  return <span className="size-2 rounded-full bg-destructive shrink-0" title="Not configured" />
}

export function ConfigTab({ config, onUpdateConfig, onClearConfig }: ConfigTabProps) {
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTestUsers, setShowTestUsers] = useState(false)

  useEffect(() => {
    fetch("/api/dev/config-status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setEnvStatus(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const testUserKeys = ["user1", "user2", "user3", "user4", "user5"]

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Org & User IDs
        </div>

        <ConfigInput
          label="Organization ID"
          hint="SCENARIO_ORG_ID"
          value={config.orgId}
          envSet={envStatus?.orgId ?? false}
          onChange={(v) => onUpdateConfig({ orgId: v })}
        />

        <ConfigInput
          label="Organizer User ID"
          hint="SCENARIO_DEV_USER_ID"
          value={config.devUserId}
          envSet={envStatus?.devUserId ?? false}
          onChange={(v) => onUpdateConfig({ devUserId: v })}
        />
      </div>

      <div>
        <button
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
          onClick={() => setShowTestUsers(!showTestUsers)}
        >
          {showTestUsers ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          Test Users ({testUserKeys.filter((k) => envStatus?.testUsers[k] || config.testUsers[k]).length}/{testUserKeys.length} configured)
        </button>

        {showTestUsers && (
          <div className="space-y-2 mt-2">
            {testUserKeys.map((key, i) => (
              <ConfigInput
                key={key}
                label={`User ${i + 1}`}
                hint={`TEST_USER_${i + 1}_ID`}
                value={config.testUsers[key] ?? ""}
                envSet={envStatus?.testUsers[key] ?? false}
                onChange={(v) =>
                  onUpdateConfig({
                    testUsers: { ...config.testUsers, [key]: v },
                  })
                }
              />
            ))}
          </div>
        )}
      </div>

      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs text-muted-foreground"
        onClick={onClearConfig}
      >
        <Trash2 className="size-3 mr-1.5" />
        Clear All Overrides
      </Button>
    </div>
  )
}

function ConfigInput({
  label,
  hint,
  value,
  envSet,
  onChange,
}: {
  label: string
  hint: string
  value: string
  envSet: boolean
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <StatusDot envSet={envSet} overrideSet={!!value} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(e.target.value.trim())}
        placeholder={hint}
        className="h-7 text-xs font-mono"
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
      />
    </div>
  )
}
