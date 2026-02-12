"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import { HackathonCard } from "@/components/hackathon/hackathon-card"
import { sortByStatusPriority } from "@/lib/utils/sort-hackathons"
import type { HackathonStatus } from "@/lib/db/hackathon-types"

type BrowseHackathon = {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  startsAt: string | null
  endsAt: string | null
  registrationOpensAt: string | null
  registrationClosesAt: string | null
}

type Props = {
  initialHackathons: BrowseHackathon[]
}

function toCardData(h: BrowseHackathon) {
  return {
    id: h.id,
    slug: h.slug,
    name: h.name,
    description: h.description,
    status: h.status as HackathonStatus,
    registration_opens_at: h.registrationOpensAt,
    registration_closes_at: h.registrationClosesAt,
    starts_at: h.startsAt,
    ends_at: h.endsAt,
  }
}

export function BrowseHackathonGrid({ initialHackathons }: Props) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<BrowseHackathon[] | null>(null)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.length < 2) {
      setResults(null)
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/public/hackathons?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.hackathons)
        }
      } catch {
        setResults(null)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])

  const hackathons = results ?? initialHackathons
  const sorted = results
    ? hackathons
    : sortByStatusPriority(
        hackathons.map(toCardData)
      ).map((c) => hackathons.find((h) => h.id === c.id)!)

  return (
    <div className="space-y-4">
      <div className="relative w-64">
        {loading ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        )}
        <Input
          placeholder="Search hackathons..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          name="hackathon-search"
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
        />
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="size-10 text-muted-foreground mb-4" />
            <CardTitle className="mb-2">
              {query.length >= 2 ? "No results found" : "No hackathons available"}
            </CardTitle>
            <CardDescription>
              {query.length >= 2
                ? "Try a different search term"
                : "Check back later for new hackathons"}
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((h) => (
            <HackathonCard
              key={h.id}
              hackathon={toCardData(h)}
              href={`/e/${h.slug}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
