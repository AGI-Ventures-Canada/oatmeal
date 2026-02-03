import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { resolvePageTenant } from "@/lib/services/tenants"
import { getHackathonByIdForOrganizer } from "@/lib/services/public-hackathons"
import { listHackathonSponsorsWithTenants } from "@/lib/services/sponsors"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, ExternalLink } from "lucide-react"
import { SponsorForm } from "./sponsor-form"

type PageProps = {
  params: Promise<{ id: string }>
}

const tierLabels: Record<string, string> = {
  title: "Title",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
  partner: "Partner",
}

export default async function SponsorsPage({ params }: PageProps) {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  const tenant = await resolvePageTenant()
  const { id } = await params
  const hackathon = await getHackathonByIdForOrganizer(id, tenant.id)

  if (!hackathon) {
    notFound()
  }

  const sponsors = await listHackathonSponsorsWithTenants(id)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/hackathons/${hackathon.id}`}>
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sponsors</h1>
          <p className="text-muted-foreground">{hackathon.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4" />
            Add Sponsor
          </CardTitle>
          <CardDescription>Add a new sponsor to the hackathon</CardDescription>
        </CardHeader>
        <CardContent>
          <SponsorForm hackathonId={hackathon.id} />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Current Sponsors ({sponsors.length})</h2>
        {sponsors.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No sponsors yet. Add your first sponsor above.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sponsors.map((sponsor) => (
              <Card key={sponsor.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{sponsor.name}</CardTitle>
                    <Badge variant="outline">{tierLabels[sponsor.tier]}</Badge>
                  </div>
                  {sponsor.website_url && (
                    <CardDescription className="flex items-center gap-1">
                      <a
                        href={sponsor.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {new URL(sponsor.website_url).hostname}
                        <ExternalLink className="size-3" />
                      </a>
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <SponsorActions
                    hackathonId={hackathon.id}
                    sponsorId={sponsor.id}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SponsorActions({
  hackathonId,
  sponsorId,
}: {
  hackathonId: string
  sponsorId: string
}) {
  return (
    <form action={`/api/dashboard/hackathons/${hackathonId}/sponsors/${sponsorId}`} method="POST">
      <input type="hidden" name="_method" value="DELETE" />
      <Button type="submit" variant="destructive" size="sm" className="w-full">
        Remove
      </Button>
    </form>
  )
}
