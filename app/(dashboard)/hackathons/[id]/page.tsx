import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { resolvePageTenant } from "@/lib/services/tenants"
import { getHackathonByIdWithFullData, getHackathonByIdWithAccess } from "@/lib/services/public-hackathons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { HackathonPreviewClient } from "@/components/hackathon/preview/hackathon-preview-client"
import { HackathonPageActions } from "@/components/hackathon/hackathon-page-actions"
import { LifecycleStepper } from "@/components/hackathon/lifecycle-stepper"

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

  const accessCheck = await getHackathonByIdWithAccess(id, tenant.id, userId)

  if (!accessCheck) {
    notFound()
  }

  const hackathon = accessCheck.isOrganizer
    ? await getHackathonByIdWithFullData(id, tenant.id)
    : null

  if (accessCheck.isOrganizer && !hackathon) {
    notFound()
  }

  if (!accessCheck.isOrganizer) {
    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={[
            { label: "Dashboard", href: "/home" },
            { label: accessCheck.name },
          ]}
          title={accessCheck.name}
          description={
            accessCheck.isSponsor
              ? "You are a sponsor of this hackathon"
              : "View hackathon details"
          }
          actions={
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/e/${accessCheck.slug}`} target="_blank">
                  <ExternalLink className="mr-2 size-4" />
                  View Live
                </Link>
              </Button>
              <Badge variant="secondary">{accessCheck.status}</Badge>
            </>
          }
        />
        {accessCheck.description && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap text-muted-foreground">
              {accessCheck.description}
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/home" },
          { label: hackathon!.name },
        ]}
        title={hackathon!.name}
        description="Click on any section below to edit"
        actions={
          <HackathonPageActions
            hackathonId={hackathon!.id}
            slug={hackathon!.slug}
            status={hackathon!.status}
            isOrganizer={true}
          />
        }
      />

      <LifecycleStepper
        hackathonId={hackathon!.id}
        status={hackathon!.status}
      />

      <div className="rounded-lg border overflow-hidden">
        <HackathonPreviewClient hackathon={hackathon!} isEditable={true} />
      </div>
    </div>
  )
}
