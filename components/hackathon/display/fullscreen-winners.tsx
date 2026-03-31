"use client"

import { FullscreenWrapper } from "./fullscreen-wrapper"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface WinnerData {
  prizeName: string
  prizeDescription: string | null
  prizeValue: string | null
  submissionTitle: string
  teamName: string
}

interface FullscreenWinnersProps {
  winners: WinnerData[]
  hackathonName: string
}

export function FullscreenWinners({
  winners,
  hackathonName,
}: FullscreenWinnersProps) {
  return (
    <FullscreenWrapper>
      <div className="flex w-full max-w-6xl flex-col items-center gap-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-4xl">
          {hackathonName}
        </h1>
        {winners.length === 0 ? (
          <p className="text-2xl text-muted-foreground">
            No winners announced yet
          </p>
        ) : (
          <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {winners.map((winner) => (
              <Card key={`${winner.prizeName}-${winner.submissionTitle}`}>
                <CardHeader>
                  <CardTitle className="text-center text-xl">
                    {winner.prizeName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-2">
                  <p className="text-lg font-medium text-foreground">
                    {winner.submissionTitle}
                  </p>
                  <p className="text-muted-foreground">{winner.teamName}</p>
                  {winner.prizeValue && (
                    <p className="text-sm text-muted-foreground">
                      {winner.prizeValue}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </FullscreenWrapper>
  )
}
