import { auth } from "@clerk/nextjs/server"
import { HeaderLogo } from "@/components/public/header-logo"
import { HeaderAuth } from "@/components/public/header-auth"
import { AppSidebarSimple } from "@/components/app-sidebar-simple"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  const isSignedIn = !!userId

  if (!isSignedIn) {
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
          {children}
        </main>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebarSimple />
      <SidebarInset>
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
