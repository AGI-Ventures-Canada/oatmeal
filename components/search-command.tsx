"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@clerk/nextjs"
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
  Calendar,
  FileText,
} from "lucide-react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { DOC_PAGES, PINNED_DOC_URLS, searchDocs } from "@/lib/docs-pages"

type HackathonResult = { id: string; name: string; slug: string; isOrganized?: boolean }

const navigationItems = [
  { title: "Dashboard", href: "/home", icon: Home },
  { title: "Explore Hackathons", href: "/browse", icon: Search },
]

const hackathonItems = [
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

const authedFunctionalityItems = [...navigationItems, ...hackathonItems, ...settingsItems]

const DIALOG_VERTICAL_OFFSET = 235

export const OPEN_SEARCH_EVENT = "open-search"

export function SearchCommand() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [canScrollMore, setCanScrollMore] = useState(false)
  const [events, setEvents] = useState<HackathonResult[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsError, setEventsError] = useState(false)
  const [fetchedQuery, setFetchedQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { isSignedIn } = useAuth()


  function getListEl() {
    return containerRef.current?.querySelector<HTMLDivElement>('[data-slot="command-list"]') ?? null
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (isSignedIn) setOpen((prev) => !prev)
      }
    }
    const openHandler = () => { if (isSignedIn) setOpen(true) }
    document.addEventListener("keydown", down)
    document.addEventListener(OPEN_SEARCH_EVENT, openHandler)
    return () => {
      document.removeEventListener("keydown", down)
      document.removeEventListener(OPEN_SEARCH_EVENT, openHandler)
    }
  }, [isSignedIn])

  useEffect(() => {
    let active = true
    const delay = open && query.length >= 2 ? 300 : 0
    const timer = setTimeout(() => {
      if (!open || query.length < 2) {
        setFetchedQuery(query)
        setEvents([])
        setEventsLoading(false)
        return
      }
      setEventsLoading(true)
      setEventsError(false)
      const q = encodeURIComponent(query)
      Promise.all([
        fetch(`/api/public/hackathons?q=${q}&limit=5`).then((res) => (res.ok ? res.json() : null)),
        isSignedIn
          ? fetch(`/api/dashboard/hackathons?q=${q}`).then((res) => (res.ok ? res.json() : null))
          : Promise.resolve(null),
      ])
        .then(([pub, organized]) => {
          if (!active) return
          const seen = new Set<string>()
          const results: HackathonResult[] = []
          for (const h of (organized?.hackathons ?? [])) {
            seen.add(h.id)
            results.push({ id: h.id, name: h.name, slug: h.slug, isOrganized: true })
          }
          for (const h of (pub?.hackathons ?? [])) {
            if (!seen.has(h.id)) results.push({ id: h.id, name: h.name, slug: h.slug })
          }
          setFetchedQuery(query)
          setEvents(results)
        })
        .catch(() => { if (active) setEventsError(true) })
        .finally(() => { if (active) setEventsLoading(false) })
    }, delay)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [open, query, isSignedIn])

  useEffect(() => {
    if (!open) return
    const check = () => {
      const el = getListEl()
      if (!el) return
      setCanScrollMore(el.scrollTop + el.clientHeight < el.scrollHeight - 4)
    }
    const frame = requestAnimationFrame(() => requestAnimationFrame(check))
    const el = getListEl()
    const ro = new ResizeObserver(check)
    const mo = new MutationObserver(check)
    if (el) {
      ro.observe(el)
      mo.observe(el, { childList: true, subtree: true })
    }
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      mo.disconnect()
    }
  }, [open, query])

  function checkScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    setCanScrollMore(el.scrollTop + el.clientHeight < el.scrollHeight - 4)
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      setCanScrollMore(false)
      setQuery("")
      setEvents([])
      setEventsLoading(false)
      setEventsError(false)
      setFetchedQuery("")
    }
  }

  function navigate(href: string) {
    router.push(href)
    handleOpenChange(false)
  }

  function handleCreateHackathon() {
    handleOpenChange(false)
    router.push("/create")
  }

  const q = query.toLowerCase()

  const matchedEvents = q ? events.slice(0, 5) : []

  const matchedFunctionality = q
    ? authedFunctionalityItems.filter((i) => i.title.toLowerCase().includes(q)).slice(0, 3)
    : []

  const matchedDocs = q ? searchDocs(q, 4) : []

  const debouncePending = open && query.length >= 2 && query !== fetchedQuery
  const hasSearchResults = debouncePending || eventsLoading || eventsError || matchedEvents.length > 0 || matchedFunctionality.length > 0 || matchedDocs.length > 0

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Search"
        description="Navigate to any page or action"
        className="md:max-w-3xl"
        contentStyle={{ top: `calc(50vh - ${DIALOG_VERTICAL_OFFSET}px)`, translate: "-50% 0" }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search pages, events, and docs..."
            value={query}
            onValueChange={setQuery}
          />
          <div className="relative" ref={containerRef}>
            <CommandList className="!max-h-[min(60vh,420px)] !overflow-y-auto scrollbar-thin" onScroll={checkScroll}>
              {q ? (
                <>
                  {!hasSearchResults && (
                    <div className="py-6 text-center text-sm text-muted-foreground">No results found.</div>
                  )}
                  {(debouncePending || eventsLoading || eventsError || matchedEvents.length > 0) && (
                    <CommandGroup heading="Events">
                      {debouncePending || eventsLoading ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">Searching events...</div>
                      ) : eventsError ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">Search failed. Try again.</div>
                      ) : (
                        matchedEvents.map((event) => {
                          const href = event.isOrganized ? `/e/${event.slug}/manage` : `/e/${event.slug}`
                          return (
                          <CommandItem
                            key={event.id}
                            value={event.id}
                            onSelect={() => navigate(href)}
                          >
                            <Calendar />
                            {event.name}
                          </CommandItem>
                        )})
                      )}
                    </CommandGroup>
                  )}
                  {matchedFunctionality.length > 0 && (
                    <CommandGroup heading="Pages">
                      {matchedFunctionality.map((item) => (
                        <CommandItem
                          key={item.href}
                          value={item.href}
                          onSelect={() => navigate(item.href)}
                        >
                          <item.icon />
                          {item.title}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {matchedDocs.length > 0 && (
                    <CommandGroup heading="Docs">
                      {matchedDocs.map((doc) => (
                        <CommandItem
                          key={doc.url}
                          value={doc.url}
                          onSelect={() => navigate(doc.url)}
                        >
                          <FileText />
                          {doc.title}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </>
              ) : (
                <>
                  <CommandEmpty>No results found.</CommandEmpty>

                  <CommandGroup heading="Navigation">
                    {navigationItems.map((item) => (
                      <CommandItem
                        key={item.href}
                        value={item.href}
                        onSelect={() => navigate(item.href)}
                      >
                        <item.icon />
                        {item.title}
                      </CommandItem>
                    ))}
                  </CommandGroup>

                  {isSignedIn && (
                    <>
                      <CommandGroup heading="Hackathons">
                        <CommandItem value="create-hackathon" onSelect={handleCreateHackathon}>
                          <Plus />
                          Create Hackathon
                        </CommandItem>
                        {hackathonItems.map((item) => (
                          <CommandItem
                            key={item.href}
                            value={item.href}
                            onSelect={() => navigate(item.href)}
                          >
                            <item.icon />
                            {item.title}
                          </CommandItem>
                        ))}
                      </CommandGroup>

                      <CommandGroup heading="Settings">
                        {settingsItems.map((item) => (
                          <CommandItem
                            key={item.href}
                            value={item.href}
                            onSelect={() => navigate(item.href)}
                          >
                            <item.icon />
                            {item.title}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}

                  <CommandGroup heading="Docs">
                    {DOC_PAGES.filter((p) => PINNED_DOC_URLS.includes(p.url)).map((doc) => (
                      <CommandItem
                        key={doc.url}
                        value={doc.url}
                        onSelect={() => navigate(doc.url)}
                      >
                        <FileText />
                        {doc.title}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
            <div className={cn(
              "pointer-events-none absolute bottom-0 left-0 right-0 h-16 transition-opacity duration-200",
              canScrollMore ? "opacity-100" : "opacity-0"
            )} style={{ background: "linear-gradient(to top, var(--popover) 0%, var(--popover) 10%, transparent 100%)" }} />
          </div>
        </Command>
      </CommandDialog>

    </>
  )
}
