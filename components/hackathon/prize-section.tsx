import { PrizeCard } from "./prize-card"
import type { Prize, PrizeType } from "@/lib/db/hackathon-types"

type PrizeWithWinner = Prize & {
  winner?: {
    submissionTitle: string
    teamName: string | null
  } | null
}

interface PrizeSectionProps {
  prizes: PrizeWithWinner[]
}

export function PrizeSection({ prizes }: PrizeSectionProps) {
  if (prizes.length === 0) {
    return null
  }

  return (
    <section className="py-12">
      <div className="mx-auto max-w-4xl px-4">
        <h2 className="text-2xl font-bold mb-8 text-center">Prizes</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {prizes.map((prize) => (
            <PrizeCard
              key={prize.id}
              name={prize.name}
              description={prize.description}
              value={prize.value}
              type={prize.type}
              winner={prize.winner}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
