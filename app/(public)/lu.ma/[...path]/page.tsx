import { permanentRedirect } from "next/navigation"

type PageProps = {
  params: Promise<{ path: string[] }>
}

export default async function LumaShortUrlPage({ params }: PageProps) {
  const { path } = await params
  permanentRedirect(`/import?url=${encodeURIComponent(`https://luma.com/${path.join("/")}`)}`)}
