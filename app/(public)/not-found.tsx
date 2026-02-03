import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, Search } from "lucide-react"

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
      <div className="text-8xl font-bold text-muted-foreground/20 mb-4">404</div>
      <h1 className="text-2xl font-bold mb-2">Page not found</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        The event or organization you&apos;re looking for doesn&apos;t exist or may have been removed.
      </p>
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href="/browse">
            <Search className="mr-2 size-4" />
            Browse Events
          </Link>
        </Button>
        <Button asChild>
          <Link href="/">
            <Home className="mr-2 size-4" />
            Go Home
          </Link>
        </Button>
      </div>
    </div>
  )
}
