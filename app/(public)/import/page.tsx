import { notFound } from "next/navigation"
import { EventImportEditor } from "@/components/hackathon/event-import-editor"
import { extractEventPageData } from "@/lib/services/event-page-import"
import { extractEventPageRichContent } from "@/lib/services/luma-extract"
import { normalizeUrl } from "@/lib/utils/url"
import { ttlCache } from "@/lib/utils/ttl-cache"
import type { Metadata } from "next"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const query = await searchParams
  const rawUrl = Array.isArray(query.url) ? query.url[0] : query.url

  if (!rawUrl) {
    return { title: "Import from Event Page | Oatmeal" }
  }

  const normalized = normalizeUrl(rawUrl)
  const eventData = await ttlCache(`import:data:${normalized}`, () => extractEventPageData(normalized))

  if (!eventData) {
    return { title: "Import from Event Page | Oatmeal" }
  }

  return {
    title: `Import "${eventData.name}" | Oatmeal`,
    description: `Create a hackathon from the event page: ${eventData.name}`,
  }
}

export default async function EventImportPage({ searchParams }: PageProps) {
  const query = await searchParams
  const rawUrl = Array.isArray(query.url) ? query.url[0] : query.url

  if (!rawUrl) {
    notFound()
  }

  const normalizedUrl = normalizeUrl(rawUrl)

  const [eventData, richContent] = await Promise.all([
    ttlCache(`import:data:${normalizedUrl}`, () => extractEventPageData(normalizedUrl)),
    ttlCache(`import:rich:${normalizedUrl}`, () => extractEventPageRichContent(normalizedUrl)),
  ])

  if (!eventData) {
    notFound()
  }

  return (
    <EventImportEditor
      eventData={eventData}
      richContent={richContent}
      sourceUrl={normalizedUrl}
      storageKey="oatmeal:event-page-import"
      submitPath="/api/dashboard/import/event-page"
    />
  )
}
