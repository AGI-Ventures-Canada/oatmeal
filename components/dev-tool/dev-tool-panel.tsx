"use client"

import { useState } from "react"
import { FlaskConical, X, Beaker, Users2, Settings2, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ScenariosTab } from "./tabs/scenarios-tab"
import { PersonasTab } from "./tabs/personas-tab"
import { EventToolsTab } from "./tabs/event-tools-tab"
import { ConfigTab } from "./tabs/config-tab"
import { useDevConfig } from "./use-dev-config"
import type { EventContext } from "./use-event-context"

export type Tab = "scenarios" | "personas" | "event" | "config"

const TABS: { key: Tab; label: string; icon: typeof Beaker; eventOnly?: boolean }[] = [
  { key: "scenarios", label: "Scenarios", icon: Beaker },
  { key: "personas", label: "Personas", icon: Users2 },
  { key: "event", label: "Event", icon: Settings2, eventOnly: true },
  { key: "config", label: "Config", icon: Wrench },
]

interface DevToolPanelProps {
  eventContext: EventContext | null
  onClose: () => void
  onSaveState: () => void
}

export function DevToolPanel({ eventContext, onClose, onSaveState }: DevToolPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>(eventContext ? "event" : "scenarios")
  const { config, updateConfig, clearConfig } = useDevConfig()

  const visibleTabs = TABS.filter((t) => !t.eventOnly || eventContext)

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Dev Tools</span>
          {eventContext && (
            <Badge variant="outline" className="text-[10px]">
              {eventContext.slug}
            </Badge>
          )}
        </div>
        <Button size="sm" variant="ghost" className="size-7 p-0" onClick={onClose}>
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="flex gap-1 border-b pb-0">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors rounded-t-md -mb-px border-b-2",
                activeTab === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-3" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="min-h-[120px]">
        {activeTab === "scenarios" && <ScenariosTab />}
        {activeTab === "personas" && (
          <PersonasTab eventContext={eventContext} onSwitchTab={setActiveTab} />
        )}
        {activeTab === "event" && eventContext && (
          <EventToolsTab eventContext={eventContext} onSaveState={onSaveState} />
        )}
        {activeTab === "config" && (
          <ConfigTab config={config} onUpdateConfig={updateConfig} onClearConfig={clearConfig} />
        )}
      </div>
    </div>
  )
}
