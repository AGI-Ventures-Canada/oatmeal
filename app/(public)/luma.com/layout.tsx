import { HeaderLogo } from "@/components/public/header-logo"
import { HeaderAuth } from "@/components/public/header-auth"

export default function LumaImportLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
