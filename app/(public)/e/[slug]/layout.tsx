type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function EventLayout({ children }: LayoutProps) {
  return <>{children}</>
}
