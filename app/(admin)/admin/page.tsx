import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { isAdminEnabled } from "@/lib/auth/principal"
import { getPlatformStats } from "@/lib/services/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

async function assertAdmin() {
  if (!isAdminEnabled()) redirect("/")
  const session = await auth()
  if (!session.userId) redirect("/sign-in")
  const metadata = (session.sessionClaims as Record<string, unknown>)?.metadata as
    | Record<string, unknown>
    | undefined
  if (metadata?.admin !== true) redirect("/")
}

export default async function AdminOverviewPage() {
  await assertAdmin()
  const stats = await getPlatformStats()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.tenants}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Hackathons</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.hackathons}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.participants}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.submissions}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hackathons</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">View and edit all hackathons across tenants.</p>
            <Link
              href="/admin/hackathons"
              className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              View all hackathons
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Test Scenarios</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Seed the database with hackathons at different lifecycle stages.</p>
            <Link
              href="/admin/scenarios"
              className="mt-3 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Run a scenario
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
