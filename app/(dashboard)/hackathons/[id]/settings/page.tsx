import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import { resolvePageTenant } from "@/lib/services/tenants"
import { getHackathonByIdForOrganizer } from "@/lib/services/public-hackathons"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SettingsForm } from "./settings-form"
import { PageHeader } from "@/components/page-header"

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
      <PageHeader
        breadcrumbs={[
          { label: "Hackathons", href: "/hackathons" },
          { label: hackathon.name, href: `/hackathons/${hackathon.id}` },
          { label: "Settings" },
        ]}
        title="Settings"
        description={hackathon.name}
      />

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
