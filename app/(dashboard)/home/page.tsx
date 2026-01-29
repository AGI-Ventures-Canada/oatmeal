import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Trophy, Search, Plus } from "lucide-react"
import { resolvePageTenant } from "@/lib/services/tenants"
import {
  listParticipatingHackathons,
  listOrganizedHackathons,
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

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  const tenant = await resolvePageTenant()

  const [myHackathons, organizedHackathons] = await Promise.all([
    listParticipatingHackathons(userId),
    listOrganizedHackathons(tenant.id),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Your hackathons at a glance
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">My Hackathons</h2>
        {myHackathons.length === 0 ? (
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
            {myHackathons.map((h) => (
              <Card key={h.id}>
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
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Organized Hackathons</h2>
        {organizedHackathons.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Plus className="size-10 text-muted-foreground mb-4" />
              <CardTitle className="mb-2">No hackathons created</CardTitle>
              <CardDescription>
                Create your first hackathon to get started
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizedHackathons.map((h) => (
              <Card key={h.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{h.name}</CardTitle>
                    <Badge variant="secondary">{h.status}</Badge>
                  </div>
                  <CardDescription>{h.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
