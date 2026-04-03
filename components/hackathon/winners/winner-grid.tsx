"use client"

import { WinnerCard } from "@/components/hackathon/winners/winner-card"

interface Winner {
  prizeName: string
  prizeDescription: string | null
  prizeValue: string | null
  submissionTitle: string
  teamName: string
}

interface WinnerGridProps {
  winners: Winner[]
}

export function WinnerGrid({ winners }: WinnerGridProps) {
  if (winners.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        No winners announced yet
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {winners.map((winner, i) => (
        <WinnerCard
          key={i}
          prizeName={winner.prizeName}
          prizeDescription={winner.prizeDescription}
          prizeValue={winner.prizeValue}
          submissionTitle={winner.submissionTitle}
          teamName={winner.teamName}
        />
      ))}
    </div>
  )
}
