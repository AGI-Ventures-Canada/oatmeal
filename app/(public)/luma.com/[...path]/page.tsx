import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { extractLumaEventData } from "@/lib/services/luma-import"
import { getOrCreateTenant } from "@/lib/services/tenants"
import { LumaImportEditor } from "@/components/hackathon/luma-import-editor"
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

  const { orgId } = await auth()
  const tenant = orgId ? await getOrCreateTenant(orgId) : null

  const organizer = tenant
    ? {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logo_url: tenant.logo_url,
        logo_url_dark: tenant.logo_url_dark,
        clerk_org_id: tenant.clerk_org_id ?? "",
      }
    : null

  return <LumaImportEditor eventData={eventData} lumaSlug={slug} organizer={organizer} />
}
