import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Clock, Moon, Sun, Calendar, CalendarDays, Zap } from "lucide-react"
import type { HackathonStatus, TenantProfile } from "@/lib/db/hackathon-types"

interface EventHeroProps {
  name: string
  bannerUrl: string | null
  status: HackathonStatus
  startsAt: string | null
  endsAt: string | null
  organizer: Pick<TenantProfile, "name" | "slug" | "logo_url">
  onDatesClick?: () => void
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

function formatTimeRange(startsAt: string | null, endsAt: string | null): string | null {
  if (!startsAt || !endsAt) return null

  const start = new Date(startsAt)
  const end = new Date(endsAt)

  const timeFormat: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  }

  const startTime = start.toLocaleTimeString("en-US", timeFormat)
  const endTime = end.toLocaleTimeString("en-US", timeFormat)

  return `${startTime} - ${endTime}`
}

interface DurationInfo {
  label: string
  icon: typeof Clock
  description: string
}

function getDurationInfo(startsAt: string | null, endsAt: string | null): DurationInfo | null {
  if (!startsAt || !endsAt) return null

  const start = new Date(startsAt)
  const end = new Date(endsAt)
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

  const startDay = start.getDate()
  const endDay = end.getDate()
  const crossesMidnight = endDay !== startDay || end.getMonth() !== start.getMonth()

  if (hours <= 0) return null

  if (hours < 3) {
    return { label: "Quick Sprint", icon: Zap, description: "Under 3 hours" }
  }

  if (hours < 6) {
    return { label: "Half Day", icon: Sun, description: `${Math.round(hours)} hours` }
  }

  if (hours < 12) {
    return { label: "Day Event", icon: Sun, description: `${Math.round(hours)} hours` }
  }

  if (hours < 24 && crossesMidnight) {
    return { label: "Overnight", icon: Moon, description: `${Math.round(hours)} hours` }
  }

  if (hours < 24) {
    return { label: "Full Day", icon: Sun, description: `${Math.round(hours)} hours` }
  }

  if (hours < 48) {
    return { label: "Overnight", icon: Moon, description: "~1 day" }
  }

  if (hours < 72) {
    return { label: "Weekend", icon: Calendar, description: "2-3 days" }
  }

  if (hours < 168) {
    return { label: "Week Long", icon: CalendarDays, description: `${Math.round(hours / 24)} days` }
  }

  return { label: "Multi-Week", icon: CalendarDays, description: `${Math.round(hours / 24)} days` }
}

export function EventHero({
  name,
  bannerUrl,
  status,
  startsAt,
  endsAt,
  organizer,
  onDatesClick,
}: EventHeroProps) {
  const durationInfo = getDurationInfo(startsAt, endsAt)
  const timeRange = formatTimeRange(startsAt, endsAt)

  const datesContent = (
    <div className="flex flex-col gap-1">
      <p className="text-lg text-muted-foreground">
        {formatDateRange(startsAt, endsAt)}
      </p>
      {timeRange && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Clock className="size-3.5" />
          {timeRange}
          {durationInfo && (
            <span className="text-muted-foreground/70">
              ({durationInfo.description})
            </span>
          )}
        </p>
      )}
    </div>
  )

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
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={getStatusBadgeVariant(status)}>
                {getStatusLabel(status)}
              </Badge>
              {durationInfo && (
                <Badge variant="outline" className="gap-1">
                  <durationInfo.icon className="size-3" />
                  {durationInfo.label}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground">
              {name}
            </h1>
            {onDatesClick ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDatesClick()
                }}
                className="group w-fit rounded-md px-2 py-1 -mx-2 -my-1 transition-colors hover:bg-muted/80"
              >
                <div className="flex items-center gap-2">
                  {datesContent}
                  <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    Edit
                  </span>
                </div>
              </button>
            ) : (
              datesContent
            )}
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
