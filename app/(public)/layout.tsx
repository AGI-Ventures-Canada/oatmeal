import Link from "next/link"
import { HeaderAuth } from "@/components/public/header-auth"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl">
            Oatmeal
          </Link>
          <nav className="flex items-center gap-4">
            <HeaderAuth />
          </nav>
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
}
