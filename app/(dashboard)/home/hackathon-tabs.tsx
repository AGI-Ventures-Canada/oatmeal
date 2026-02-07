"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Trophy, Search, Star, Plus } from "lucide-react"
import { CreateHackathonDrawer } from "@/components/hackathon/create-hackathon-drawer"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

interface TimelineState {
  label: string
  variant: "default" | "secondary" | "outline"
}

function getTimelineState(hackathon: Hackathon): TimelineState {
  const now = new Date()
  const { status, registration_opens_at, registration_closes_at, starts_at, ends_at } = hackathon

  if (status === "completed") {
    return { label: "Completed", variant: "outline" }
  }

  if (status === "judging") {
    return { label: "Judging", variant: "default" }
  }

  if (status === "active") {
    return { label: "Live", variant: "default" }
  }

  if (status === "draft") {
    return { label: "Draft", variant: "secondary" }
  }

  const opensAt = registration_opens_at ? new Date(registration_opens_at) : null
  const closesAt = registration_closes_at ? new Date(registration_closes_at) : null
  const startsAt = starts_at ? new Date(starts_at) : null
  const endsAt = ends_at ? new Date(ends_at) : null

  if (opensAt && closesAt) {
    if (now < opensAt) {
      return { label: "Coming Soon", variant: "secondary" }
    }
    if (now >= opensAt && now <= closesAt) {
      return { label: "Registration Open", variant: "default" }
    }
    if (now > closesAt && startsAt && now < startsAt) {
      return { label: "Registration Closed", variant: "secondary" }
    }
    if (startsAt && endsAt && now >= startsAt && now <= endsAt) {
      return { label: "Live", variant: "default" }
    }
    if (endsAt && now > endsAt) {
      return { label: "Completed", variant: "outline" }
    }
  }

  if (status === "registration_open") {
    return { label: "Registration Open", variant: "default" }
  }

  return { label: "Coming Soon", variant: "secondary" }
}

function CountdownBadge({ startsAt }: { startsAt: string }) {
  const [timeLeft, setTimeLeft] = useState("")

  useEffect(() => {
    function updateCountdown() {
      const now = new Date()
      const start = new Date(startsAt)
      const diff = start.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft("Starting now")
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      if (days > 0) {
        setTimeLeft(`Starts in ${days}d ${hours}h`)
      } else if (hours > 0) {
        setTimeLeft(`Starts in ${hours}h ${minutes}m`)
      } else {
        setTimeLeft(`Starts in ${minutes}m`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 60000)
    return () => clearInterval(interval)
  }, [startsAt])

  return <Badge variant="default">{timeLeft}</Badge>
}

function getParticipantBadge(hackathon: Hackathon) {
  const now = new Date()
  const { status, registration_opens_at, registration_closes_at, starts_at, ends_at } = hackathon

  if (status === "completed") {
    return <Badge variant="outline">Completed</Badge>
  }

  if (status === "judging") {
    return <Badge variant="default">Judging</Badge>
  }

  if (status === "active") {
    return <Badge variant="default">Live</Badge>
  }

  if (status === "draft") {
    return <Badge variant="secondary">Draft</Badge>
  }

  const opensAt = registration_opens_at ? new Date(registration_opens_at) : null
  const closesAt = registration_closes_at ? new Date(registration_closes_at) : null
  const startsAt = starts_at ? new Date(starts_at) : null
  const endsAt = ends_at ? new Date(ends_at) : null

  if (opensAt && closesAt) {
    if (now < opensAt) {
      return <Badge variant="secondary">Coming Soon</Badge>
    }
    if (now >= opensAt && now <= closesAt) {
      if (startsAt && now < startsAt) {
        return <CountdownBadge startsAt={starts_at!} />
      }
      return <Badge variant="default">Registration Open</Badge>
    }
    if (now > closesAt && startsAt && now < startsAt) {
      return <CountdownBadge startsAt={starts_at!} />
    }
    if (startsAt && endsAt && now >= startsAt && now <= endsAt) {
      return <Badge variant="default">Live</Badge>
    }
    if (endsAt && now > endsAt) {
      return <Badge variant="outline">Completed</Badge>
    }
  }

  if (status === "registration_open") {
    if (startsAt && now < startsAt) {
      return <CountdownBadge startsAt={starts_at!} />
    }
    return <Badge variant="default">Registration Open</Badge>
  }

  return <Badge variant="secondary">Coming Soon</Badge>
}

type Props = {
  myHackathons: HackathonWithRole[]
  organizedHackathons: Hackathon[]
  sponsoredHackathons: Hackathon[]
}

export function HackathonTabs({
  myHackathons,
  organizedHackathons,
  sponsoredHackathons,
}: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const tabFromUrl = searchParams.get("tab")
  const validTabs = ["participating", "organized", "sponsored"]

  const defaultTab = organizedHackathons.length > 0
    ? "organized"
    : sponsoredHackathons.length > 0
      ? "sponsored"
      : "participating"

  const activeTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : defaultTab

  const handleTabChange = (value: string) => {
    router.push(`/home?tab=${value}`, { scroll: false })
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
      <TabsList>
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
        <TabsTrigger value="sponsored">
          Sponsoring
          {sponsoredHackathons.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {sponsoredHackathons.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="participating">
        {myHackathons.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Trophy className="size-10 text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No hackathons yet</CardTitle>
              <CardDescription className="mb-4">
                Browse and join hackathons to get started
              </CardDescription>
              <Button asChild>
                <Link href="/browse">
                  <Search className="mr-2 size-4" />
                  Browse hackathons
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myHackathons.map((h) => (
              <Link key={h.id} href={`/e/${h.slug}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{h.name}</CardTitle>
                      {getParticipantBadge(h)}
                    </div>
                    <CardDescription>{h.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="outline">{h.role}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="organized">
        {organizedHackathons.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Trophy className="size-10 text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No hackathons created</CardTitle>
              <CardDescription className="mb-4">
                Create your first hackathon to get started
              </CardDescription>
              <CreateHackathonDrawer
                trigger={
                  <Button>
                    <Plus className="mr-2 size-4" />
                    Create Hackathon
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizedHackathons.map((h) => (
              <Link key={h.id} href={`/e/${h.slug}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{h.name}</CardTitle>
                      {(() => {
                        const state = getTimelineState(h)
                        return <Badge variant={state.variant}>{state.label}</Badge>
                      })()}
                    </div>
                    <CardDescription>{h.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="sponsored">
        {sponsoredHackathons.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Star className="size-10 text-muted-foreground mb-4" />
              <CardTitle className="mb-2">Not sponsoring any hackathons</CardTitle>
              <CardDescription className="mb-4">
                Browse hackathons to find sponsorship opportunities
              </CardDescription>
              <Button asChild>
                <Link href="/browse">
                  <Search className="mr-2 size-4" />
                  Browse hackathons
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sponsoredHackathons.map((h) => (
              <Link key={h.id} href={`/e/${h.slug}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{h.name}</CardTitle>
                      {(() => {
                        const state = getTimelineState(h)
                        return <Badge variant={state.variant}>{state.label}</Badge>
                      })()}
                    </div>
                    <CardDescription>{h.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="outline">
                      <Star className="mr-1 size-3" />
                      Sponsor
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
