import { notFound } from "next/navigation"
import { extractLumaEventData } from "@/lib/services/luma-import"
import { LumaImportForm } from "@/components/hackathon/luma-import-form"
import type { Metadata } from "next"

type PageProps = {
  params: Promise<{ path: string[] }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { path } = await params
  const slug = path.join("/")
  const eventData = await extractLumaEventData(slug)

  if (!eventData) {
    return { title: "Import from Luma | Oatmeal" }
  }

  return {
    title: `Import "${eventData.name}" from Luma | Oatmeal`,
    description: `Create a hackathon from the Luma event: ${eventData.name}`,
  }
}

export default async function LumaImportPage({ params }: PageProps) {
  const { path } = await params
  const slug = path.join("/")
  const eventData = await extractLumaEventData(slug)

  if (!eventData) {
    notFound()
  }

  return <LumaImportForm eventData={eventData} lumaSlug={slug} />
}
