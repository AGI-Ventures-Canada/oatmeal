import { redirect, notFound } from "next/navigation"
import { getManageHackathon } from "@/lib/services/manage-hackathon"

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function ManageLayout({ children, params }: LayoutProps) {
  const { slug } = await params
  const result = await getManageHackathon(slug)

  if (!result) {
    const { auth } = await import("@clerk/nextjs/server")
    const { userId } = await auth()
    if (!userId) {
      redirect("/sign-in")
    }
    notFound()
  }

  return <div className="p-6">{children}</div>
}
