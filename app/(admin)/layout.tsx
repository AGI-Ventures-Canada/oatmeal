import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { isAdminEnabled } from "@/lib/auth/principal"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (!isAdminEnabled()) {
    redirect("/")
  }

  const session = await auth()
  if (!session.userId) {
    redirect("/sign-in")
  }

  const metadata = (session.sessionClaims as Record<string, unknown>)?.metadata as
    | Record<string, unknown>
    | undefined

  if (metadata?.admin !== true) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 md:px-6">
          <Link href="/admin" className="text-sm font-semibold">Admin</Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/admin" className="hover:text-foreground">Overview</Link>
            <Link href="/admin/hackathons" className="hover:text-foreground">Hackathons</Link>
            <Link href="/admin/scenarios" className="hover:text-foreground">Scenarios</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 md:p-6">{children}</main>
    </div>
  )
}
