import { Search } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"

export default function BrowsePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Browse Hackathons</h1>
        <p className="text-muted-foreground">
          Discover and join published hackathons
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="size-10 text-muted-foreground mb-4" />
          <CardTitle className="mb-2">Coming soon</CardTitle>
          <CardDescription>
            Search and filter hackathons will be available here
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  )
}
