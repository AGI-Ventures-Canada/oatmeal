import { auth } from "@clerk/nextjs/server"
import { HeaderLogo } from "@/components/public/header-logo"
import { HeaderAuth } from "@/components/public/header-auth"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  const isSignedIn = !!userId

  const content = (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isSignedIn && <SidebarTrigger className="-ml-1" />}
            <HeaderLogo />
          </div>
          {!isSignedIn && (
            <nav className="flex items-center gap-2">
              <HeaderAuth />
            </nav>
          )}
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          Powered by Oatmeal
        </div>
      </footer>
    </div>
  )

  if (!isSignedIn) {
    return content
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {content}
      </SidebarInset>
    </SidebarProvider>
  )
}
