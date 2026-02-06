import Link from "next/link"
import Image from "next/image"
import { Search, Calendar } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import { listPublicHackathons } from "@/lib/services/public-hackathons"
import type { HackathonStatus } from "@/lib/db/hackathon-types"

interface TimelineState {
  label: string
  variant: "default" | "secondary" | "outline"
}

function getTimelineState(hackathon: {
  status: HackathonStatus
  registration_opens_at: string | null
  registration_closes_at: string | null
  starts_at: string | null
  ends_at: string | null
}): TimelineState {
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

function formatDateRange(
  startsAt: string | null,
  endsAt: string | null
): string {
  if (!startsAt) return "Dates TBD"

  const start = new Date(startsAt)
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }

  if (!endsAt) return start.toLocaleDateString("en-US", opts)

  const end = new Date(endsAt)

  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth()
  ) {
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.getDate()}, ${end.getFullYear()}`
  }

  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`
}

export default async function BrowsePage() {
  const hackathons = await listPublicHackathons()

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Browse" }]}
        title="Browse Hackathons"
        description="Discover and join published hackathons"
      />

      {hackathons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="size-10 text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No hackathons available</CardTitle>
            <CardDescription>
              Check back later for new hackathons
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hackathons.map((hackathon) => (
            <Card key={hackathon.id} className="relative hover:bg-muted/50 transition-colors h-full">
              {hackathon.banner_url && (
                <div className="relative h-32 overflow-hidden">
                  <Image
                    src={hackathon.banner_url}
                    alt={`${hackathon.name} banner`}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base truncate">
                    <Link
                      href={`/e/${hackathon.slug}`}
                      className="after:absolute after:inset-0"
                    >
                      {hackathon.name}
                    </Link>
                  </CardTitle>
                  {(() => {
                    const state = getTimelineState(hackathon)
                    return <Badge variant={state.variant}>{state.label}</Badge>
                  })()}
                </div>
                {hackathon.description && (
                  <CardDescription className="line-clamp-2">
                    {hackathon.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="size-3.5" />
                  <span>
                    {formatDateRange(hackathon.starts_at, hackathon.ends_at)}
                  </span>
                </div>
              </CardContent>
              <CardFooter>
                {hackathon.organizer.slug ? (
                  <Link
                    href={`/o/${hackathon.organizer.slug}`}
                    className="relative z-10 flex items-center gap-2 hover:underline"
                  >
                    {hackathon.organizer.logo_url && (
                      <Image
                        src={hackathon.organizer.logo_url}
                        alt={hackathon.organizer.name}
                        width={16}
                        height={16}
                        className="rounded-full"
                      />
                    )}
                    <span className="text-muted-foreground">
                      {hackathon.organizer.name}
                    </span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-2">
                    {hackathon.organizer.logo_url && (
                      <Image
                        src={hackathon.organizer.logo_url}
                        alt={hackathon.organizer.name}
                        width={16}
                        height={16}
                        className="rounded-full"
                      />
                    )}
                    <span className="text-muted-foreground">
                      {hackathon.organizer.name}
                    </span>
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
