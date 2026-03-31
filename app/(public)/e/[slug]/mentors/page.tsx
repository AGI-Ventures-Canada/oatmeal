import { notFound } from "next/navigation"
import { getPublicHackathon } from "@/lib/services/public-hackathons"
import { MentorQueuePublic } from "@/components/hackathon/mentors/mentor-queue-public"
import type { Metadata } from "next"

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const hackathon = await getPublicHackathon(slug)

  return {
    title: hackathon ? `Mentor Queue | ${hackathon.name}` : "Mentor Queue",
  }
}

export default async function MentorsPage({ params }: PageProps) {
  const { slug } = await params
  const hackathon = await getPublicHackathon(slug)

  if (!hackathon) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{hackathon.name}</h1>
        <p className="text-muted-foreground">Mentor Queue</p>
      </div>
      <MentorQueuePublic slug={slug} />
    </div>
  )
}
