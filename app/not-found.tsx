import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <div className="text-8xl font-bold text-muted-foreground/20 mb-4">404</div>
      <h1 className="text-2xl font-bold mb-2">Page not found</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Button asChild>
        <Link href="/">
          <Home className="mr-2 size-4" />
          Go Home
        </Link>
      </Button>
    </div>
  )
}
