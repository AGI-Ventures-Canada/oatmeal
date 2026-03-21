"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Home,
  Search,
  Users,
  Scale,
  Megaphone,
  Star,
  Plus,
  Settings,
  BookOpen,
  Building2,
  Key,
  Clock,
  Webhook,
  Plug,
} from "lucide-react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

const navigationItems = [
  { title: "Dashboard", href: "/home", icon: Home, shortcut: "H" },
  { title: "Browse Hackathons", href: "/browse", icon: Search, shortcut: "B" },
]

const hackathonItems = [
  { title: "Participating", href: "/home?tab=participating", icon: Users },
  { title: "Judging", href: "/home?tab=judging", icon: Scale },
  { title: "Organizing", href: "/home?tab=organized", icon: Megaphone },
  { title: "Sponsoring", href: "/home?tab=sponsored", icon: Star },
]

const settingsItems = [
  { title: "Organization Settings", href: "/settings/profile", icon: Building2 },
  { title: "API Keys", href: "/settings/api-keys", icon: Key },
  { title: "Schedules", href: "/settings/schedules", icon: Clock },
  { title: "Webhooks", href: "/settings/webhooks", icon: Webhook },
  { title: "Integrations", href: "/settings/integrations", icon: Plug },
  { title: "API Docs", href: "/docs", icon: BookOpen },
]

interface SearchCommandProps {
  onCreateHackathon?: () => void
}

export function SearchCommand({ onCreateHackathon }: SearchCommandProps) {
  const [open, setOpen] = useState(false)
  const [canScrollMore, setCanScrollMore] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  function checkScroll() {
    const el = listRef.current
    if (!el) return
    setCanScrollMore(el.scrollTop + el.clientHeight < el.scrollHeight - 4)
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  function navigate(href: string) {
    router.push(href)
    setOpen(false)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search"
      description="Navigate to any page or action"
      className="md:max-w-2xl"
    >
      <Command>
      <CommandInput placeholder="Search pages and actions..." />
      <div className="relative">
      <CommandList
        ref={listRef}
        className="md:max-h-[420px]"
        onScroll={checkScroll}
        onLoad={checkScroll}
      >
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.href}
              value={item.title}
              onSelect={() => navigate(item.href)}
            >
              <item.icon />
              {item.title}
              {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Hackathons">
          <CommandItem
            value="Create Hackathon"
            onSelect={() => {
              setOpen(false)
              onCreateHackathon?.()
            }}
          >
            <Plus />
            Create Hackathon
          </CommandItem>
          {hackathonItems.map((item) => (
            <CommandItem
              key={item.href}
              value={item.title}
              onSelect={() => navigate(item.href)}
            >
              <item.icon />
              {item.title}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Settings">
          <CommandItem
            value="Settings"
            onSelect={() => navigate("/settings")}
          >
            <Settings />
            Settings
          </CommandItem>
          {settingsItems.map((item) => (
            <CommandItem
              key={item.href}
              value={item.title}
              onSelect={() => navigate(item.href)}
            >
              <item.icon />
              {item.title}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      {canScrollMore && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-popover to-transparent" />
      )}
      </div>
      </Command>
    </CommandDialog>
  )
}
