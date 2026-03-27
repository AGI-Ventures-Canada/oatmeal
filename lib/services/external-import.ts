import { normalizeUrl } from "@/lib/utils/url"
import { extractLumaEventData } from "@/lib/services/luma-import"
import { extractEventPageData } from "@/lib/services/event-page-import"
import { extractLumaRichContent, extractEventPageRichContent } from "@/lib/services/luma-extract"
import type { EventPageData } from "@/lib/services/event-page-import"
import type { EventPageRichContent } from "@/lib/services/luma-extract"

export function isLumaUrl(input: string): boolean {
  try {
    const normalized = input.startsWith("http") ? input : `https://${input}`
    const { hostname } = new URL(normalized)
    return (
      hostname === "luma.com" ||
      hostname === "www.luma.com" ||
      hostname === "lu.ma" ||
      hostname === "www.lu.ma"
    )
  } catch {
    return false
  }
}

function extractLumaSlug(input: string): string | null {
  try {
    const normalized = input.startsWith("http") ? input : `https://${input}`
    const slug = new URL(normalized).pathname.replace(/^\/+/, "").replace(/\/+$/, "")
    return slug || null
  } catch {
    return null
  }
}

export async function extractExternalEventData(url: string): Promise<EventPageData | null> {
  if (isLumaUrl(url)) {
    const slug = extractLumaSlug(url)
    if (!slug) return null
    return extractLumaEventData(slug)
  }

  return extractEventPageData(normalizeUrl(url))
}

export async function extractExternalRichContent(url: string): Promise<EventPageRichContent | null> {
  if (isLumaUrl(url)) {
    const slug = extractLumaSlug(url)
    if (!slug) return null
    return extractLumaRichContent(slug)
  }

  return extractEventPageRichContent(normalizeUrl(url))
}
