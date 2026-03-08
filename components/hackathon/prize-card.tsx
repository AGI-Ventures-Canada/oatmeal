import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import type { PrizeType, HackathonStatus } from "@/lib/db/hackathon-types"

interface PrizeCardProps {
  name: string
  description: string | null
  value: string | null
  type: PrizeType
  winner?: {
    submissionTitle: string
    teamName: string | null
  } | null
  hackathonSlug?: string
  hackathonStatus?: HackathonStatus
}

const typeLabels: Record<PrizeType, string> = {
  score: "Score-based",
  criteria: "Best in Category",
  favorite: "Organizer's Pick",
  crowd: "Crowd's Favorite",
}

export function PrizeCard({ name, description, value, type, winner, hackathonSlug, hackathonStatus }: PrizeCardProps) {
  const showCrowdLink =
    type === "crowd" &&
    hackathonSlug &&
    hackathonStatus &&
    ["active", "judging"].includes(hackathonStatus)

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <h3 className="font-semibold leading-tight">{name}</h3>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          )}
        </div>
        {showCrowdLink ? (
          <Link href={`/e/${hackathonSlug}/vote`}>
            <Badge variant="secondary" className="shrink-0 text-xs hover:bg-secondary/80 cursor-pointer">
              {typeLabels[type]}
            </Badge>
          </Link>
        ) : (
          <Badge variant="secondary" className="shrink-0 text-xs">
            {typeLabels[type]}
          </Badge>
        )}
      </div>
      {value && (
        <p className="text-sm font-medium">{value}</p>
      )}
      {winner && (
        <div className="pt-1 border-t">
          <p className="text-xs text-muted-foreground">
            Winner: <span className="font-medium text-foreground">{winner.submissionTitle}</span>
            {winner.teamName && <> by {winner.teamName}</>}
          </p>
        </div>
      )}
    </div>
  )
}
