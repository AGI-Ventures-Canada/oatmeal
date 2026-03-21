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
} from "@/components/ui/command"

const navigationItems = [
  { title: "Dashboard", href: "/home", icon: Home },
  { title: "Browse Hackathons", href: "/browse", icon: Search },
]

const hackathonItems = [
  { title: "Create Hackathon", href: "/home", icon: Plus },
  { title: "Participating", href: "/home?tab=participating", icon: Users },
  { title: "Judging", href: "/home?tab=judging", icon: Scale },
  { title: "Organizing", href: "/home?tab=organized", icon: Megaphone },
  { title: "Sponsoring", href: "/home?tab=sponsored", icon: Star },
]

const settingsItems = [
  { title: "Settings", href: "/settings", icon: Settings },
  { title: "Organization Settings", href: "/settings/profile", icon: Building2 },
  { title: "API Keys", href: "/settings/api-keys", icon: Key },
  { title: "Schedules", href: "/settings/schedules", icon: Clock },
  { title: "Webhooks", href: "/settings/webhooks", icon: Webhook },
  { title: "Integrations", href: "/settings/integrations", icon: Plug },
  { title: "API Docs", href: "/docs", icon: BookOpen },
]

export function SearchCommand() {
  const [open, setOpen] = useState(false)
  const [canScrollMore, setCanScrollMore] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

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

  useEffect(() => {
    if (!open) return
    const el = listRef.current
    if (!el) return
    const check = () =>
      setCanScrollMore(el.scrollTop + el.clientHeight < el.scrollHeight - 4)
    check()
    el.addEventListener("scroll", check)
    return () => el.removeEventListener("scroll", check)
  }, [open])

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
          <CommandList ref={listRef} className="md:max-h-[420px]">
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
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Hackathons">
              {hackathonItems.map((item) => (
                <CommandItem
                  key={item.title}
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
