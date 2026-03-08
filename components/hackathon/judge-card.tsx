import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { HackathonJudgeDisplay } from "@/lib/db/hackathon-types"

interface JudgeCardProps {
  judge: HackathonJudgeDisplay
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function JudgeCard({ judge }: JudgeCardProps) {
  return (
    <div className="flex flex-col items-center gap-2 w-28">
      <Avatar className="size-16">
        {judge.headshot_url && <AvatarImage src={judge.headshot_url} alt={judge.name} />}
        <AvatarFallback className="text-sm">{getInitials(judge.name)}</AvatarFallback>
      </Avatar>
      <div className="text-center space-y-0.5">
        <p className="text-sm font-medium leading-tight">{judge.name}</p>
        {judge.title && (
          <p className="text-xs text-muted-foreground leading-tight">{judge.title}</p>
        )}
        {judge.organization && (
          <p className="text-xs text-muted-foreground leading-tight">{judge.organization}</p>
        )}
      </div>
    </div>
  )
}
