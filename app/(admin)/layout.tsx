import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { isAdminEnabled } from "@/lib/auth/principal"
import { AdminNav } from "./admin-nav"

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
          <AdminNav />
          <Link href="/" className="ml-auto text-sm text-muted-foreground hover:text-foreground">
            Home dashboard →
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-4 md:p-6">{children}</main>
    </div>
  )
}
