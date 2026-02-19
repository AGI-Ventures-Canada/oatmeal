"use client"

import { useState } from "react"
import { Calendar } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription } from "@/components/ui/card"
import { HackathonGrid } from "@/components/org/hackathon-grid"
import { getTimelineState } from "@/lib/utils/timeline"
import type { HackathonWithRole } from "@/components/org/hackathon-grid"

const COMPLETED_LABELS = new Set(["Judging", "Completed", "Archived"])

type Props = {
  allHackathons: HackathonWithRole[]
  organizedHackathons: HackathonWithRole[]
  sponsoredHackathons: HackathonWithRole[]
  totalUniqueEvents: number
}

export function OrgEventTabs({
  allHackathons,
  organizedHackathons,
  sponsoredHackathons,
  totalUniqueEvents,
}: Props) {
  const [showCompleted, setShowCompleted] = useState(false)

  const hasCompleted = allHackathons.some((h) =>
    COMPLETED_LABELS.has(getTimelineState(h).label)
  )

  return (
    <Tabs defaultValue="all" className="w-full">
      <div className="flex items-center justify-between mb-6">
        <TabsList variant="line">
          <TabsTrigger value="all">All ({totalUniqueEvents})</TabsTrigger>
          <TabsTrigger value="organized">
            Organizing ({organizedHackathons.length})
          </TabsTrigger>
          <TabsTrigger value="sponsored">
            Sponsoring ({sponsoredHackathons.length})
          </TabsTrigger>
        </TabsList>

        {hasCompleted && (
          <div className="flex items-center gap-2">
            <Switch
              id="show-completed"
              checked={showCompleted}
              onCheckedChange={setShowCompleted}
            />
            <Label htmlFor="show-completed" className="text-sm text-muted-foreground cursor-pointer">
              Show completed
            </Label>
          </div>
        )}
      </div>

      <TabsContent value="all">
        <HackathonGrid hackathons={allHackathons} showCompleted={showCompleted} />
      </TabsContent>

      <TabsContent value="organized">
        {organizedHackathons.length > 0 ? (
          <HackathonGrid hackathons={organizedHackathons} showCompleted={showCompleted} />
        ) : (
          <EmptyState message="This organization hasn't organized any public events yet." />
        )}
      </TabsContent>

      <TabsContent value="sponsored">
        {sponsoredHackathons.length > 0 ? (
          <HackathonGrid hackathons={sponsoredHackathons} showCompleted={showCompleted} />
        ) : (
          <EmptyState message="This organization hasn't sponsored any public events yet." />
        )}
      </TabsContent>
    </Tabs>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="size-10 text-muted-foreground mb-4" />
        <CardDescription>{message}</CardDescription>
      </CardContent>
    </Card>
  )
}
