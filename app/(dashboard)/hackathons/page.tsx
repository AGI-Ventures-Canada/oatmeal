import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Trophy, Search, Plus } from "lucide-react"
import { CreateHackathonDrawer } from "@/components/hackathon/create-hackathon-drawer"
import { resolvePageTenant } from "@/lib/services/tenants"
import {
  listParticipatingHackathons,
  listOrganizedHackathons,
  listSponsoredHackathons,
} from "@/lib/services/hackathons"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default async function HackathonsPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  const tenant = await resolvePageTenant()

  const [myHackathons, organizedHackathons, sponsoredHackathons] = await Promise.all([
    listParticipatingHackathons(userId),
    listOrganizedHackathons(tenant.id),
    listSponsoredHackathons(tenant.id),
  ])

  const seenIds = new Set<string>()
  const allHackathons: { id: string; name: string; description: string | null; status: string; role: string }[] = []

  for (const h of organizedHackathons) {
    if (!seenIds.has(h.id)) {
      seenIds.add(h.id)
      allHackathons.push({ ...h, role: "organizer" })
    }
  }

  for (const h of sponsoredHackathons) {
    if (!seenIds.has(h.id)) {
      seenIds.add(h.id)
      allHackathons.push({ ...h, role: "sponsor" })
    }
  }

  for (const h of myHackathons) {
    if (!seenIds.has(h.id)) {
      seenIds.add(h.id)
      allHackathons.push(h)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hackathons</h1>
          <p className="text-muted-foreground">
            All hackathons you organize, sponsor, or participate in
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/browse">
              <Search className="mr-2 size-4" />
              Browse
            </Link>
          </Button>
          <CreateHackathonDrawer
            trigger={
              <Button>
                <Plus className="mr-2 size-4" />
                Create
              </Button>
            }
          />
        </div>
      </div>

      {allHackathons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy className="size-10 text-muted-foreground mb-4" />
            <CardTitle className="mb-2">No hackathons yet</CardTitle>
            <CardDescription className="mb-4">
              Browse and join hackathons to get started
            </CardDescription>
            <Button asChild>
              <Link href="/browse">
                <Search className="mr-2 size-4" />
                Browse hackathons
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allHackathons.map((h) => (
            <Link key={h.id} href={`/hackathons/${h.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{h.name}</CardTitle>
                    <Badge variant="secondary">{h.status}</Badge>
                  </div>
                  <CardDescription>{h.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">{h.role}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
