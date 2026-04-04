"use client"

import { useState } from "react"
import {
  Users,
  FileText,
  DoorOpen,
  Gavel,
  Trophy,
  MessageCircle,
  Zap,
  Trash2,
  Award,
  Tags,
  Share2,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Section, PipelineButton, type SeedStatus } from "./event-shared"

interface EventSeedSectionProps {
  seedStatus: SeedStatus
  pending: string | null
  devAction: (path: string, method?: string, body?: unknown) => Promise<unknown>
}

export function EventSeedSection({ seedStatus, pending, devAction }: EventSeedSectionProps) {
  const [showDanger, setShowDanger] = useState(false)

  const isLoading = !!pending
  const hasTeams = seedStatus.teams > 0
  const hasSubmissions = seedStatus.submissions > 0
  const hasJudging = seedStatus.criteria > 0 && seedStatus.assignments > 0

  return (
    <div className="space-y-3">
      <Section label="Pipeline">
        <div className="space-y-1.5">
          <PipelineButton
            icon={<Zap className="size-3" />}
            label="Seed Full Pipeline"
            subtitle="teams, submissions, judging, prizes, rooms"
            loading={isLoading}
            onClick={() => devAction("/seed-all")}
          />

          <div className="border-l-2 border-muted ml-2 pl-3 space-y-1.5">
            <PipelineButton
              icon={<Users className="size-3" />}
              label="Seed 5 Teams"
              loading={isLoading}
              done={hasTeams}
              count={seedStatus.teams}
              countLabel="teams"
              onClick={() => devAction("/seed-teams", "POST", { count: 5 })}
            />

            <PipelineButton
              icon={<FileText className="size-3" />}
              label="Seed Submissions"
              subtitle="1 per team"
              loading={isLoading}
              done={hasSubmissions}
              count={seedStatus.submissions}
              countLabel="submissions"
              blocked={!hasTeams}
              blockedHint="needs teams"
              onClick={() => devAction("/seed-submissions")}
            />

            <PipelineButton
              icon={<Gavel className="size-3" />}
              label="Seed Judging Setup"
              subtitle="3 criteria, 3 judges, assign all"
              loading={isLoading}
              done={hasJudging}
              count={seedStatus.assignments}
              countLabel="assignments"
              blocked={!hasSubmissions}
              blockedHint="needs submissions"
              onClick={() => devAction("/seed-judging")}
            />

            <div className="flex gap-1.5">
              <PipelineButton
                icon={<Trophy className="size-3" />}
                label="Scores (60%)"
                loading={isLoading}
                done={seedStatus.scoredAssignments > 0 && seedStatus.scoredAssignments < seedStatus.assignments}
                count={seedStatus.scoredAssignments}
                countLabel="scored"
                blocked={!hasJudging}
                blockedHint="needs judging"
                onClick={() => devAction("/seed-scores", "POST", { percentage: 60 })}
                className="flex-1"
              />
              <PipelineButton
                icon={<Trophy className="size-3" />}
                label="Scores (100%)"
                loading={isLoading}
                done={seedStatus.scoredAssignments > 0 && seedStatus.scoredAssignments === seedStatus.assignments}
                count={seedStatus.scoredAssignments}
                countLabel="scored"
                blocked={!hasJudging}
                blockedHint="needs judging"
                onClick={() => devAction("/seed-scores", "POST", { percentage: 100 })}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </Section>

      <Section label="Extras">
        <div className="grid grid-cols-2 gap-1.5">
          <PipelineButton icon={<FileText className="size-3" />} label="Seed Challenge" loading={isLoading} done={seedStatus.challengeReleased} onClick={() => devAction("/seed-challenge")} />
          <PipelineButton icon={<Award className="size-3" />} label="Seed 3 Prizes" loading={isLoading} done={seedStatus.prizes > 0} count={seedStatus.prizes} countLabel="prizes" onClick={() => devAction("/seed-prizes")} />
          <PipelineButton icon={<Tags className="size-3" />} label="Seed 3 Categories" loading={isLoading} done={seedStatus.categories > 0} count={seedStatus.categories} countLabel="categories" onClick={() => devAction("/seed-categories")} />
          <PipelineButton icon={<DoorOpen className="size-3" />} label="Seed 3 Rooms" loading={isLoading} done={seedStatus.rooms > 0} count={seedStatus.rooms} countLabel="rooms" onClick={() => devAction("/seed-rooms", "POST", { count: 3, assignTeams: true })} />
          <PipelineButton icon={<MessageCircle className="size-3" />} label="Seed Mentor Requests" loading={isLoading} done={seedStatus.mentorRequests > 0} count={seedStatus.mentorRequests} countLabel="requests" onClick={() => devAction("/seed-mentors")} />
          <PipelineButton icon={<Share2 className="size-3" />} label="Seed Social Posts" loading={isLoading} onClick={() => devAction("/seed-social")} />
        </div>
      </Section>

      <button
        className="w-full flex items-center justify-center gap-1 text-xs text-destructive/70 hover:text-destructive py-1 transition-colors"
        onClick={() => setShowDanger(!showDanger)}
      >
        {showDanger ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        Danger Zone
      </button>

      {showDanger && (
        <Button
          size="sm"
          variant="destructive"
          disabled={isLoading}
          onClick={() => devAction("/seed-data", "DELETE")}
          className="h-7 text-xs"
        >
          <Trash2 className="size-3 mr-1" />
          Clear All Seed Data
        </Button>
      )}
    </div>
  )
}
