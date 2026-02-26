import { permanentRedirect } from "next/navigation"

type PageProps = {
  params: Promise<{ path: string[] }>
}

export default async function LumaShortUrlPage({ params }: PageProps) {
  const { path } = await params
  permanentRedirect(`/luma.com/${path.join("/")}`)
}
