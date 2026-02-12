import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { HeaderLogo } from "@/components/public/header-logo"
import { HeaderAuth } from "@/components/public/header-auth"
import { HackathonCard } from "@/components/hackathon/hackathon-card"
import { listPublicHackathons } from "@/lib/services/public-hackathons"
import { sortByStatusPriority } from "@/lib/utils/sort-hackathons"

export default async function Home() {
  const { userId } = await auth()

  if (userId) {
    redirect("/home")
  }

  const hackathons = sortByStatusPriority(await listPublicHackathons())

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeaderLogo />
          </div>
          <nav className="flex items-center gap-2">
            <HeaderAuth />
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <section className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Oatmeal</h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-md mx-auto">
            The hackathon platform for organizers, teams, and judges.
          </p>
        </section>
        <section className="container mx-auto px-4 pb-16">
          {hackathons.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {hackathons.map((h) => (
                <HackathonCard key={h.id} hackathon={h} href={`/e/${h.slug}`} />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              No hackathons yet. Check back soon!
            </p>
          )}
        </section>
      </main>
    </div>
  )
}
