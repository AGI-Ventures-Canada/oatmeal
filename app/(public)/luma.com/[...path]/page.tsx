import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { extractLumaEventData } from "@/lib/services/luma-import"
import { extractLumaRichContent } from "@/lib/services/luma-extract"
import { ttlCache } from "@/lib/utils/ttl-cache"
import { createHackathonFromImport, createSponsorsFromImport, createPrizesFromImport } from "@/lib/services/luma-import-create"
import { getOrCreateTenant } from "@/lib/services/tenants"
import { logAudit } from "@/lib/services/audit"
import { scopesForRole } from "@/lib/auth/types"
import { LumaImportEditor } from "@/components/hackathon/luma-import-editor"
import { ImportComplete } from "@/components/hackathon/import-complete"
import type { Metadata } from "next"

type PageProps = {
  params: Promise<{ path: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { path } = await params
  const slug = path.join("/")
  const eventData = await ttlCache(`luma:data:${slug}`, () => extractLumaEventData(slug))

  if (!eventData) {
    return { title: "Import from Luma | Oatmeal" }
  }

  return {
    title: `Import "${eventData.name}" from Luma | Oatmeal`,
    description: `Create a hackathon from the Luma event: ${eventData.name}`,
  }
}

export default async function LumaImportPage({ params, searchParams }: PageProps) {
  const { path } = await params
  const query = await searchParams
  const slug = path.join("/")

  const [eventData, richContent] = await Promise.all([
    ttlCache(`luma:data:${slug}`, () => extractLumaEventData(slug)),
    ttlCache(`luma:rich:${slug}`, () => extractLumaRichContent(slug)),
  ])

  if (!eventData) {
    notFound()
  }

  const editMode = query.edit === "true"

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
        metadata: { source: "luma_import" },
      })

      const { triggerWebhooks } = await import("@/lib/services/webhooks")
      triggerWebhooks(tenant.id, "hackathon.created", {
        event: "hackathon.created",
        timestamp: new Date().toISOString(),
        data: { hackathonId: hackathon.id, source: "luma_import" },
      }).catch(console.error)

      return <ImportComplete slug={hackathon.slug} />
    }
  }

  return <LumaImportEditor eventData={eventData} richContent={richContent} lumaSlug={slug} />
}
