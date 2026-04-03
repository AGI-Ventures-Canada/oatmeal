import { isAdminEnabled } from "@/lib/auth/principal"
import { DevToolbar } from "@/components/dev-toolbar"

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function EventLayout({ children, params }: LayoutProps) {
  const { slug } = await params

  return (
    <>
      {children}
      {isAdminEnabled() && <DevToolbar slug={slug} />}
    </>
  )
}
