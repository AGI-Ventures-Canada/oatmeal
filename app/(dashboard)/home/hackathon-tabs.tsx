"use client"

import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Trophy, Search, Star, Plus, Check } from "lucide-react"
import { CreateHackathonDrawer } from "@/components/hackathon/create-hackathon-drawer"
import { CountdownBadge } from "@/components/hackathon/countdown-badge"
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
import { getTimelineState } from "@/lib/utils/timeline"
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

function getParticipantBadge(hackathon: Hackathon) {
  const state = getTimelineState(hackathon)
  if (state.showCountdown && state.startsAt) {
    return <CountdownBadge startsAt={state.startsAt} />
  }
  return <Badge variant={state.variant}>{state.label}</Badge>
}

type Props = {
  myHackathons: HackathonWithRole[]
  organizedHackathons: Hackathon[]
  sponsoredHackathons: Hackathon[]
  submittedHackathonIds: string[]
}

export function HackathonTabs({
  myHackathons,
  organizedHackathons,
  sponsoredHackathons,
  submittedHackathonIds,
}: Props) {
  const submittedSet = new Set(submittedHackathonIds)
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
                  <CardContent className="flex gap-2">
                    <Badge variant="outline">{h.role}</Badge>
                    {submittedSet.has(h.id) && (
                      <Badge variant="secondary">
                        <Check className="mr-1 size-3" />
                        Submitted
                      </Badge>
                    )}
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
              <Link key={h.id} href={`/hackathons/${h.id}`}>
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
