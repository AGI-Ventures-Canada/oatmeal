import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { Home, Search } from "lucide-react"

export default function NotFound() {
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Not Found" }]}
        title="Page not found"
        description="The page you're looking for doesn't exist or has been moved."
      />

      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-8xl font-bold text-muted-foreground/20 mb-4">404</div>
        <p className="text-muted-foreground mb-8 max-w-md">
          This could be a hackathon that was deleted, a page that moved, or a URL that was typed incorrectly.
        </p>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/browse">
              <Search className="mr-2 size-4" />
              Browse Hackathons
            </Link>
          </Button>
          <Button asChild>
            <Link href="/home">
              <Home className="mr-2 size-4" />
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
