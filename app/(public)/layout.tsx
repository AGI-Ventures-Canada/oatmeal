import { auth } from "@clerk/nextjs/server"
import { PublicLayoutShell } from "@/components/public/public-layout-shell"

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  const isSignedIn = !!userId

  return (
    <PublicLayoutShell initialSignedIn={isSignedIn}>
      {children}
    </PublicLayoutShell>
  )
}
