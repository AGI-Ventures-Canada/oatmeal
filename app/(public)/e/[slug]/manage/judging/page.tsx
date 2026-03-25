import { redirect } from "next/navigation"

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function JudgingPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { tab } = await searchParams

  if (tab === "prizes") {
    redirect(`/e/${slug}/manage?tab=prizes`)
  }

  const judgeSubTabs = ["criteria", "assignments", "progress"]
  if (tab && judgeSubTabs.includes(tab)) {
    redirect(`/e/${slug}/manage?tab=judges&jtab=${tab}`)
  }

  redirect(`/e/${slug}/manage?tab=judges`)
}
