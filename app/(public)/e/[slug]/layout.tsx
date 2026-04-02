import { supabase } from "@/lib/db/client"
import { auth } from "@clerk/nextjs/server"
import { isAdminEnabled } from "@/lib/auth/principal"
import { DevToolbar } from "@/components/dev-toolbar"

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function EventLayout({ children, params }: LayoutProps) {
  const { slug } = await params

  let hackathonId: string | null = null

  if (isAdminEnabled()) {
    const { userId } = await auth()
    if (userId) {
      const db = supabase()
      const { data } = await db
        .from("hackathons")
        .select("id")
        .eq("slug", slug)
        .single()
      hackathonId = data?.id ?? null
    }
  }

  return (
    <>
      {children}
      {hackathonId && <DevToolbar hackathonId={hackathonId} />}
    </>
  )
}
