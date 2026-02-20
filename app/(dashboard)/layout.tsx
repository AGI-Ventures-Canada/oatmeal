import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { AppSidebarSimple } from "@/components/app-sidebar-simple"
import { MobileHeader } from "@/components/mobile-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  return (
    <SidebarProvider>
      <AppSidebarSimple />
      <SidebarInset>
        <MobileHeader />
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
