"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface WinnerCardProps {
  prizeName: string
  prizeDescription: string | null
  prizeValue: string | null
  submissionTitle: string
  teamName: string
}

export function WinnerCard({
  prizeName,
  prizeDescription,
  prizeValue,
  submissionTitle,
  teamName,
}: WinnerCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{prizeName}</CardTitle>
          {prizeValue && <Badge variant="secondary">{prizeValue}</Badge>}
        </div>
        {prizeDescription && (
          <p className="text-muted-foreground text-xs">{prizeDescription}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <p className="font-medium text-sm">{submissionTitle}</p>
          <p className="text-muted-foreground text-xs">{teamName}</p>
        </div>
      </CardContent>
    </Card>
  )
}
