import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { HackathonStatus, TenantProfile } from "@/lib/db/hackathon-types"

interface EventHeroProps {
  name: string
  bannerUrl: string | null
  status: HackathonStatus
  startsAt: string | null
  endsAt: string | null
  organizer: Pick<TenantProfile, "name" | "slug" | "logo_url">
}

function getStatusBadgeVariant(status: HackathonStatus): "default" | "secondary" | "outline" {
  switch (status) {
    case "active":
      return "default"
    case "registration_open":
      return "default"
    case "completed":
      return "outline"
    default:
      return "secondary"
  }
}

function getStatusLabel(status: HackathonStatus): string {
  switch (status) {
    case "draft":
      return "Draft"
    case "published":
      return "Coming Soon"
    case "registration_open":
      return "Registration Open"
    case "active":
      return "Live"
    case "judging":
      return "Judging"
    case "completed":
      return "Completed"
    case "archived":
      return "Archived"
    default:
      return status
  }
}

function formatDateRange(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt) return "Dates TBD"

  const start = new Date(startsAt)
  const formatOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }

  if (!endsAt) {
    return start.toLocaleDateString("en-US", formatOptions)
  }

  const end = new Date(endsAt)

  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.getDate()}, ${end.getFullYear()}`
  }

  return `${start.toLocaleDateString("en-US", formatOptions)} - ${end.toLocaleDateString("en-US", formatOptions)}`
}

export function EventHero({
  name,
  bannerUrl,
  status,
  startsAt,
  endsAt,
  organizer,
}: EventHeroProps) {
  return (
    <div className="relative">
      <div className="h-64 md:h-80 relative overflow-hidden bg-primary">
        {bannerUrl && (
          <Image
            src={bannerUrl}
            alt={`${name} banner`}
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>
      <div className="container mx-auto px-4">
        <div className="relative -mt-20 md:-mt-24">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(status)}>
                {getStatusLabel(status)}
              </Badge>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground">
              {name}
            </h1>
            <p className="text-lg text-muted-foreground">
              {formatDateRange(startsAt, endsAt)}
            </p>
            <div className="flex items-center gap-2">
              {organizer.logo_url && (
                <Image
                  src={organizer.logo_url}
                  alt={organizer.name}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              )}
              <span className="text-sm text-muted-foreground">
                Hosted by{" "}
                {organizer.slug ? (
                  <Link
                    href={`/o/${organizer.slug}`}
                    className="text-foreground hover:underline"
                  >
                    {organizer.name}
                  </Link>
                ) : (
                  <span className="text-foreground">{organizer.name}</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
