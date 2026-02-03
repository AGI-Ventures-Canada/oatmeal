import { Search } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"

export default function BrowsePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "Browse" }]}
        title="Browse Hackathons"
        description="Discover and join published hackathons"
      />

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
