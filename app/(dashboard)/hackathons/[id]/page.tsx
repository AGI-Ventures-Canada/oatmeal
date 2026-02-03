import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { resolvePageTenant } from "@/lib/services/tenants"
import { getHackathonByIdWithAccess } from "@/lib/services/public-hackathons"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Settings, Users } from "lucide-react"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function HackathonPage({ params }: PageProps) {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  const tenant = await resolvePageTenant()
  const { id } = await params
  const hackathon = await getHackathonByIdWithAccess(id, tenant.id, userId)

  if (!hackathon) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{hackathon.name}</h1>
          <p className="text-muted-foreground">
            {hackathon.isOrganizer
              ? "Manage your hackathon"
              : hackathon.isSponsor
                ? "You are a sponsor of this hackathon"
                : "View hackathon details"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/e/${hackathon.slug}`} target="_blank">
              <ExternalLink className="mr-2 size-4" />
              View Live
            </Link>
          </Button>
          <Badge variant="secondary">{hackathon.status}</Badge>
        </div>
      </div>

      {hackathon.isOrganizer && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-4" />
                Sponsors
              </CardTitle>
              <CardDescription>Manage hackathon sponsors</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/hackathons/${hackathon.id}/sponsors`}>
                  Manage Sponsors
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="size-4" />
                Settings
              </CardTitle>
              <CardDescription>Update hackathon details</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/hackathons/${hackathon.id}/settings`}>
                  Edit Settings
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {hackathon.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {hackathon.description}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
