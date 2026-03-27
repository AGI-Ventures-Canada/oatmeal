import { redirect } from "next/navigation"
import { getJudgingRedirectUrl } from "@/lib/utils/manage-tabs"

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function JudgingPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { tab } = await searchParams
  redirect(getJudgingRedirectUrl(slug, tab))
}
