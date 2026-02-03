import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { resolvePageTenant } from "@/lib/services/tenants"
import { getHackathonByIdForOrganizer } from "@/lib/services/public-hackathons"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { SettingsForm } from "./settings-form"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function SettingsPage({ params }: PageProps) {
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

      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">{hackathon.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hackathon Details</CardTitle>
          <CardDescription>Update your hackathon information</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            hackathonId={hackathon.id}
            initialData={{
              name: hackathon.name,
              description: hackathon.description,
              rules: hackathon.rules,
              bannerUrl: hackathon.banner_url,
              startsAt: hackathon.starts_at,
              endsAt: hackathon.ends_at,
              registrationOpensAt: hackathon.registration_opens_at,
              registrationClosesAt: hackathon.registration_closes_at,
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
