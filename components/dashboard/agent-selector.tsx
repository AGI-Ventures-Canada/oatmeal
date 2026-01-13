"use client"

import { useEffect, useState } from "react"
import { ChevronsUpDown, Check, Bot } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Agent {
  id: string
  name: string
  description: string | null
}

interface AgentSelectorProps {
  value?: string
  onValueChange: (value: string | undefined) => void
  disabled?: boolean
  placeholder?: string
}

export function AgentSelector({
  value,
  onValueChange,
  disabled,
  placeholder = "Select an agent...",
}: AgentSelectorProps) {
  const [open, setOpen] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch("/api/dashboard/agents")
        if (response.ok) {
          const data = await response.json()
          setAgents(data)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchAgents()
  }, [])

  const selectedAgent = agents.find((agent) => agent.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || loading}
        >
          {loading ? (
            "Loading agents..."
          ) : selectedAgent ? (
            <span className="flex items-center gap-2">
              <Bot className="size-4" />
              {selectedAgent.name}
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search agents..." />
          <CommandList>
            <CommandEmpty>No agents found.</CommandEmpty>
            <CommandGroup>
              {agents.map((agent) => (
                <CommandItem
                  key={agent.id}
                  value={agent.name}
                  onSelect={() => {
                    onValueChange(agent.id === value ? undefined : agent.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === agent.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{agent.name}</span>
                    {agent.description && (
                      <span className="text-xs text-muted-foreground">
                        {agent.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
