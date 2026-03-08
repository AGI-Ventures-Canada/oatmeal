import { JudgeCard } from "./judge-card"
import type { HackathonJudgeDisplay } from "@/lib/db/hackathon-types"

interface JudgeSectionProps {
  judges: HackathonJudgeDisplay[]
}

export function JudgeSection({ judges }: JudgeSectionProps) {
  if (judges.length === 0) {
    return null
  }

  return (
    <section className="py-12">
      <div className="mx-auto max-w-4xl px-4">
        <h2 className="text-2xl font-bold mb-8 text-center">Judges</h2>
        <div className="flex flex-wrap justify-center gap-6">
          {judges.map((judge) => (
            <JudgeCard key={judge.id} judge={judge} />
          ))}
        </div>
      </div>
    </section>
  )
}
