import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { TriangleAlert } from "lucide-react"
import { EventImportEditor } from "@/components/hackathon/event-import-editor"
import { extractExternalEventData, extractExternalRichContent } from "@/lib/services/external-import"
import { ttlCache } from "@/lib/utils/ttl-cache"
import { normalizeUrl } from "@/lib/utils/url"
import { createHackathonFromImport, createSponsorsFromImport, createPrizesFromImport } from "@/lib/services/luma-import-create"
import { getOrCreateTenant } from "@/lib/services/tenants"
import { logAudit } from "@/lib/services/audit"
import { scopesForRole } from "@/lib/auth/types"
import { isLumaUrl } from "@/lib/services/external-import"
import { Button } from "@/components/ui/button"
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
  const eventData = await ttlCache(`import:data:${normalized}`, () => extractExternalEventData(normalized))

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
  const editMode = query.edit === "true"

  const [eventData, richContent] = await Promise.all([
    ttlCache(`import:data:${normalizedUrl}`, () => extractExternalEventData(normalizedUrl)),
    ttlCache(`import:rich:${normalizedUrl}`, () => extractExternalRichContent(normalizedUrl)),
  ])

  if (!eventData) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="flex flex-col items-center gap-4">
          <TriangleAlert className="size-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Couldn&apos;t read that event page</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            We weren&apos;t able to extract event details from this URL. The page may not include
            structured event data, or it may require a login to view.
          </p>
          <Button asChild variant="outline">
            <Link href="/">Go back</Link>
          </Button>
        </div>
      </div>
    )
  }

  const { userId, orgId, orgRole } = await auth()
  const tenant = orgId ? await getOrCreateTenant(orgId) : null

  if (tenant && userId && !editMode) {
    const hackathon = await createHackathonFromImport(tenant.id, {
      name: eventData.name,
      description: eventData.description,
      startsAt: eventData.startsAt,
      endsAt: eventData.endsAt,
      locationType: eventData.locationType,
      locationName: eventData.locationName,
      locationUrl: eventData.locationUrl,
      imageUrl: eventData.imageUrl,
      rules: richContent?.rules ?? null,
    })

    if (hackathon) {
      if (richContent?.sponsors?.length) {
        await createSponsorsFromImport(hackathon.id, richContent.sponsors)
      }

      if (richContent?.prizes?.length) {
        await createPrizesFromImport(hackathon.id, richContent.prizes)
      }

      const source = isLumaUrl(normalizedUrl) ? "luma_import" : "event_page_import"

      const principal = {
        kind: "user" as const,
        tenantId: tenant.id,
        userId,
        orgId: orgId ?? null,
        orgRole: orgRole ?? null,
        scopes: scopesForRole(orgRole ?? null),
      }

      await logAudit({
        principal,
        action: "hackathon.created",
        resourceType: "hackathon",
        resourceId: hackathon.id,
        metadata: { source, sourceUrl: normalizedUrl },
      })

      const { triggerWebhooks } = await import("@/lib/services/webhooks")
      triggerWebhooks(tenant.id, "hackathon.created", {
        event: "hackathon.created",
        timestamp: new Date().toISOString(),
        data: { hackathonId: hackathon.id, source, sourceUrl: normalizedUrl },
      }).catch(console.error)

      redirect(`/e/${hackathon.slug}/manage`)
    }
  }

  return (
    <EventImportEditor
      eventData={eventData}
      richContent={richContent}
      sourceUrl={normalizedUrl}
      storageKey="oatmeal:external-import"
      submitPath="/api/dashboard/import/event"
    />
  )
}
