import { redirect } from "next/navigation"

type PageProps = {
  params: Promise<{ path: string[] }>
}

export default async function LumaImportPage({ params }: PageProps) {
  const { path } = await params
  redirect(`/import?url=${encodeURIComponent(`https://luma.com/${path.join("/")}`)}`)
}
