import { getHackathonById } from "@/lib/services/admin"
import { redirect } from "next/navigation"
import { AdminHackathonEditor } from "./editor"
import { AdminHackathonActivity } from "./hackathon-activity"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminHackathonDetailPage(props: PageProps) {
  const { id } = await props.params
  const hackathon = await getHackathonById(id)

  if (!hackathon) {
    redirect("/admin/hackathons")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{hackathon.name}</h1>
          <p className="text-sm text-muted-foreground">
            Tenant: {(hackathon.tenants as { name: string })?.name} · Slug: {hackathon.slug}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/e/${hackathon.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            View public page
          </a>
          <a
            href={`/e/${hackathon.slug}/manage`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Manage page
          </a>
        </div>
      </div>

      <AdminHackathonEditor hackathon={hackathon} />
      <AdminHackathonActivity hackathonId={hackathon.id} />
    </div>
  )
}
