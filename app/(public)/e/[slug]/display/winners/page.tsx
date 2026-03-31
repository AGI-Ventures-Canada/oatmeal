import { notFound } from "next/navigation"
import { getPublicHackathon } from "@/lib/services/public-hackathons"
import { getWinnerPageData } from "@/lib/services/winner-pages"
import { FullscreenWinners } from "@/components/hackathon/display/fullscreen-winners"
import type { Metadata } from "next"

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const hackathon = await getPublicHackathon(slug, { includeUnpublished: true })

  return {
    title: hackathon ? `Winners | ${hackathon.name}` : "Winners",
  }
}

export default async function DisplayWinnersPage({ params }: PageProps) {
  const { slug } = await params

  const hackathon = await getPublicHackathon(slug, { includeUnpublished: true })
  if (!hackathon) notFound()

  const entries = await getWinnerPageData(hackathon.id)
  const winners = entries.map((e) => ({
    prizeName: e.prizeName,
    prizeDescription: e.prizeDescription,
    prizeValue: e.prizeValue,
    submissionTitle: e.submissionTitle,
    teamName: e.teamName ?? "Unknown Team",
  }))

  return (
    <FullscreenWinners winners={winners} hackathonName={hackathon.name} />
  )
}
