"use client"

import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Trophy, Search, Star, Check, Loader2, Scale } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HackathonCard } from "@/components/hackathon/hackathon-card"
import { sortByStatusPriority } from "@/lib/utils/sort-hackathons"
import type { HackathonStatus } from "@/lib/db/hackathon-types"

type Hackathon = {
  id: string
  slug: string
  name: string
  description: string | null
  status: HackathonStatus
  registration_opens_at: string | null
  registration_closes_at: string | null
  starts_at: string | null
  ends_at: string | null
}

type HackathonWithRole = Hackathon & { role: string }

type Props = {
  myHackathons: HackathonWithRole[]
  organizedHackathons: Hackathon[]
  sponsoredHackathons: Hackathon[]
  judgingHackathons: Hackathon[]
  submittedHackathonIds: string[]
}

type ApiHackathon = {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
  startsAt: string | null
  endsAt: string | null
  registrationOpensAt: string | null
  registrationClosesAt: string | null
  role?: string
}

function fromApi(h: ApiHackathon): Hackathon {
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

const API_PATHS: Record<string, string> = {
  participating: "/api/dashboard/hackathons/participating",
  organized: "/api/dashboard/hackathons",
  sponsored: "/api/dashboard/hackathons/sponsored",
  judging: "/api/dashboard/hackathons/judging",
}

export function HackathonTabs({
  myHackathons,
  organizedHackathons,
  sponsoredHackathons,
  judgingHackathons,
  submittedHackathonIds,
}: Props) {
  const submittedSet = new Set(submittedHackathonIds)
  const searchParams = useSearchParams()
  const router = useRouter()

  const tabFromUrl = searchParams.get("tab")
  const validTabs = ["participating", "organized", "sponsored", "judging"]

  const defaultTab = organizedHackathons.length > 0
    ? "organized"
    : judgingHackathons.length > 0
      ? "judging"
      : sponsoredHackathons.length > 0
        ? "sponsored"
        : "participating"

  const activeTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : defaultTab

  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Record<string, Hackathon[] | null>>({})
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.length < 2) {
      setSearchResults({})
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const path = API_PATHS[activeTab]
        const res = await fetch(`${path}?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          const hackathons = data.hackathons.map((h: ApiHackathon) => ({
            ...fromApi(h),
            ...(h.role ? { role: h.role } : {}),
          }))
          setSearchResults((prev) => ({ ...prev, [activeTab]: hackathons }))
        }
      } catch {
        // Ignore search errors
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, activeTab])

  const handleTabChange = (value: string) => {
    router.push(`/home?tab=${value}`, { scroll: false })
    if (query.length >= 2 && !searchResults[value]) {
      setLoading(true)
    }
  }

  const isSearching = query.length >= 2

  const participatingList = isSearching
    ? (searchResults.participating as HackathonWithRole[] | null) ?? []
    : sortByStatusPriority(myHackathons)

  const organizedList = isSearching
    ? (searchResults.organized ?? [])
    : sortByStatusPriority(organizedHackathons)

  const sponsoredList = isSearching
    ? (searchResults.sponsored ?? [])
    : sortByStatusPriority(sponsoredHackathons)

  const judgingList = isSearching
    ? (searchResults.judging ?? [])
    : sortByStatusPriority(judgingHackathons)

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-64">
          {loading ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          )}
          <Input
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            name="dashboard-search"
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
          />
        </div>
        <TabsList variant="line">
          <TabsTrigger value="participating">
            Participating
            {myHackathons.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {myHackathons.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="organized">
            Organizing
            {organizedHackathons.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {organizedHackathons.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="judging">
            Judging
            {judgingHackathons.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {judgingHackathons.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sponsored">
            Sponsoring
            {sponsoredHackathons.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {sponsoredHackathons.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="participating">
          {participatingList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Trophy className="size-10 text-muted-foreground mb-4" />
                <CardTitle className="mb-2">
                  {isSearching ? "No results found" : "No hackathons yet"}
                </CardTitle>
                <CardDescription className="mb-4">
                  {isSearching
                    ? "Try a different search term"
                    : "Browse and join hackathons to get started"}
                </CardDescription>
                {!isSearching && (
                  <Button asChild>
                    <Link href="/browse">
                      <Search className="mr-2 size-4" />
                      Browse hackathons
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {participatingList.map((h) => (
                <HackathonCard
                  key={h.id}
                  hackathon={h}
                  href={`/e/${h.slug}`}
                  extras={
                    <>
                      <Badge variant="outline">{(h as HackathonWithRole).role}</Badge>
                      {submittedSet.has(h.id) && (
                        <Badge variant="secondary">
                          <Check className="mr-1 size-3" />
                          Submitted
                        </Badge>
                      )}
                    </>
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="organized">
          {organizedList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Trophy className="size-10 text-muted-foreground mb-4" />
                <CardTitle className="mb-2">
                  {isSearching ? "No results found" : "No hackathons created"}
                </CardTitle>
                <CardDescription>
                  {isSearching
                    ? "Try a different search term"
                    : "Create your first hackathon from the sidebar"}
                </CardDescription>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {organizedList.map((h) => (
                <HackathonCard
                  key={h.id}
                  hackathon={h}
                  href={`/e/${h.slug}/manage`}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="judging">
          {judgingList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Scale className="size-10 text-muted-foreground mb-4" />
                <CardTitle className="mb-2">
                  {isSearching ? "No results found" : "Not judging any hackathons"}
                </CardTitle>
                <CardDescription className="mb-4">
                  {isSearching
                    ? "Try a different search term"
                    : "When you're invited to judge a hackathon, it will appear here"}
                </CardDescription>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {judgingList.map((h) => (
                <HackathonCard
                  key={h.id}
                  hackathon={h}
                  href={`/e/${h.slug}`}
                  extras={
                    <Badge variant="outline">
                      <Scale className="mr-1 size-3" />
                      Judge
                    </Badge>
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sponsored">
          {sponsoredList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Star className="size-10 text-muted-foreground mb-4" />
                <CardTitle className="mb-2">
                  {isSearching ? "No results found" : "Not sponsoring any hackathons"}
                </CardTitle>
                <CardDescription className="mb-4">
                  {isSearching
                    ? "Try a different search term"
                    : "Browse hackathons to find sponsorship opportunities"}
                </CardDescription>
                {!isSearching && (
                  <Button asChild>
                    <Link href="/browse">
                      <Search className="mr-2 size-4" />
                      Browse hackathons
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sponsoredList.map((h) => (
                <HackathonCard
                  key={h.id}
                  hackathon={h}
                  href={`/e/${h.slug}`}
                  extras={
                    <Badge variant="outline">
                      <Star className="mr-1 size-3" />
                      Sponsor
                    </Badge>
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>
    </Tabs>
  )
}
