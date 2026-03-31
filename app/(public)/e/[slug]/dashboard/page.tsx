import { notFound } from "next/navigation"
import { getPublicHackathon } from "@/lib/services/public-hackathons"
import { LiveDashboard } from "@/components/hackathon/dashboard/live-dashboard"
import type { Metadata } from "next"

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const hackathon = await getPublicHackathon(slug)

  return {
    title: hackathon ? `Dashboard | ${hackathon.name}` : "Dashboard",
  }
}

export default async function DashboardPage({ params }: PageProps) {
  const { slug } = await params
  const hackathon = await getPublicHackathon(slug)

  if (!hackathon) {
    notFound()
  }

  return <LiveDashboard slug={slug} hackathonName={hackathon.name} />
}
