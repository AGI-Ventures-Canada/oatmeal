"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trophy } from "lucide-react"

type PublicResult = {
  rank: number
  submissionTitle: string
  teamName: string | null
  weightedScore: number | null
  judgeCount: number
  prizes: { id: string; name: string; value: string | null }[]
}

interface PublicResultsProps {
  results: PublicResult[]
}

export function PublicResults({ results }: PublicResultsProps) {
  if (results.length === 0) return null

  const top3 = results.filter((r) => r.rank <= 3)
  const rest = results.filter((r) => r.rank > 3)

  const sizeClass = (rank: number) => {
    if (rank === 1) return "col-span-full sm:col-span-1"
    return "col-span-full sm:col-span-1"
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <Trophy className="mx-auto size-8 text-primary" />
        <h2 className="text-2xl font-bold">Results</h2>
      </div>

      {top3.length > 0 && (
        <div className="grid sm:grid-cols-3 gap-4">
          {top3.map((r) => (
            <Card
              key={`${r.rank}-${r.submissionTitle}`}
              className={`${sizeClass(r.rank)} ${r.rank === 1 ? "border-primary" : ""}`}
            >
              <CardContent className="pt-6 text-center space-y-3">
                <div className={`text-3xl font-bold ${r.rank === 1 ? "text-4xl" : ""}`}>
                  #{r.rank}
                </div>
                <div>
                  <p className={`font-semibold ${r.rank === 1 ? "text-lg" : "text-base"}`}>
                    {r.submissionTitle}
                  </p>
                  {r.teamName && (
                    <p className="text-sm text-muted-foreground">{r.teamName}</p>
                  )}
                </div>
                {r.prizes.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1">
                    {r.prizes.map((p) => (
                      <Badge key={p.id} variant="secondary">
                        {p.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Rank</TableHead>
                <TableHead>Submission</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Prizes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rest.map((r) => (
                <TableRow key={`${r.rank}-${r.submissionTitle}`}>
                  <TableCell className="font-bold">#{r.rank}</TableCell>
                  <TableCell className="font-medium">{r.submissionTitle}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.teamName || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.prizes.map((p) => (
                        <Badge key={p.id} variant="secondary">
                          {p.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
