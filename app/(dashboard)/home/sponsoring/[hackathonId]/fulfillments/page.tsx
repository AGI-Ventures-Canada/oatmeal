import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import { resolvePageTenant } from "@/lib/services/tenants"
import { listSponsorFulfillments } from "@/lib/services/sponsor-fulfillments"
import { isValidUuid } from "@/lib/utils/uuid"
import { SponsorFulfillmentView } from "@/components/hackathon/prizes/sponsor-fulfillment-view"
import { supabase as getSupabase } from "@/lib/db/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

type PageProps = {
  params: Promise<{ hackathonId: string }>
}

export default async function SponsorFulfillmentsPage({ params }: PageProps) {
  const { hackathonId } = await params

  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  if (!isValidUuid(hackathonId)) notFound()

  const tenant = await resolvePageTenant()
  const client = getSupabase() as unknown as SupabaseClient

  const { data: hackathon } = await client
    .from("hackathons")
    .select("name, slug")
    .eq("id", hackathonId)
    .single()

  if (!hackathon) notFound()

  const { data: sponsor } = await client
    .from("hackathon_sponsors")
    .select("id")
    .eq("sponsor_tenant_id", tenant.id)
    .eq("hackathon_id", hackathonId)
    .single()

  if (!sponsor) notFound()

  const fulfillments = await listSponsorFulfillments(tenant.id, hackathonId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/home/sponsoring">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Prize Fulfillment</h1>
          <p className="text-muted-foreground">{hackathon.name}</p>
        </div>
      </div>

      <SponsorFulfillmentView
        hackathonId={hackathonId}
        fulfillments={fulfillments}
      />
    </div>
  )
}
