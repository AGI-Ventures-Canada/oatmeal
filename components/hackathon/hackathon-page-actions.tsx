"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ExternalLink,
  Monitor,
  Timer,
  DoorOpen,
  FileText,
  BarChart3,
  LayoutDashboard,
  Trophy,
  MessageCircle,
} from "lucide-react"

interface HackathonPageActionsProps {
  slug: string
  isOrganizer: boolean
}

const DISPLAY_LINKS = [
  { href: "display/timer", label: "Timer", icon: Timer },
  { href: "display/rooms", label: "Rooms", icon: DoorOpen },
  { href: "display/challenge", label: "Challenge", icon: FileText },
  { href: "display/leaderboard", label: "Leaderboard", icon: BarChart3 },
  { href: "display/winners", label: "Winners", icon: Trophy },
]

const PAGE_LINKS = [
  { href: "dashboard", label: "Live Dashboard", icon: LayoutDashboard },
  { href: "mentors", label: "Mentor Queue", icon: MessageCircle },
  { href: "winners", label: "Winners Page", icon: Trophy },
]

export function HackathonPageActions({
  slug,
  isOrganizer,
}: HackathonPageActionsProps) {
  return (
    <>
      <Button asChild variant="outline" size="sm">
        <Link href={`/e/${slug}`} target="_blank">
          <ExternalLink className="sm:mr-2 size-4" />
          <span className="hidden sm:inline">View Live</span>
        </Link>
      </Button>
      {isOrganizer ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Monitor className="sm:mr-2 size-4" />
                <span className="hidden sm:inline">Screens</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Projection Displays</DropdownMenuLabel>
              {DISPLAY_LINKS.map(({ href, label, icon: Icon }) => (
                <DropdownMenuItem key={href} asChild>
                  <Link href={`/e/${slug}/${href}`} target="_blank">
                    <Icon className="mr-2 size-4" />
                    {label}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Public Pages</DropdownMenuLabel>
              {PAGE_LINKS.map(({ href, label, icon: Icon }) => (
                <DropdownMenuItem key={href} asChild>
                  <Link href={`/e/${slug}/${href}`} target="_blank">
                    <Icon className="mr-2 size-4" />
                    {label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : null}
    </>
  )
}
