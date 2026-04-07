import { ReactNode } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface JudgePillProps {
  imageUrl: string | null
  displayName: string
  badge?: ReactNode
  action?: ReactNode
}

export function JudgePill({ imageUrl, displayName, badge, action }: JudgePillProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border py-1 pl-1 pr-1.5 text-sm">
      <Avatar size="sm">
        {imageUrl && <AvatarImage src={imageUrl} alt={displayName} />}
        <AvatarFallback className="text-[10px]">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="truncate max-w-[120px] font-medium">{displayName}</span>
      {badge}
      {action}
    </div>
  )
}
