import { notFound } from "next/navigation"
import Link from "next/link"
import { OptimizedImage } from "@/components/ui/optimized-image"
import { Calendar } from "lucide-react"
import { getPublicTenantWithEvents } from "@/lib/services/tenant-profiles"
import { OrgHeader } from "@/components/org/org-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDateRange } from "@/lib/utils/format"
import { getTimelineState } from "@/lib/utils/timeline"
import type { Metadata } from "next"
import type { HackathonStatus } from "@/lib/db/hackathon-types"

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const tenant = await getPublicTenantWithEvents(slug)

  if (!tenant) {
    return {
      title: "Organization Not Found",
    }
  }

  return {
    title: `${tenant.name} | Oatmeal`,
    description: tenant.description || `${tenant.name} on Oatmeal`,
  }
}

export default async function OrgPage({ params }: PageProps) {
  const { slug } = await params
  const tenant = await getPublicTenantWithEvents(slug)

  if (!tenant) {
    notFound()
  }

  const { organizedHackathons, sponsoredHackathons } = tenant

  const organizedIds = new Set(organizedHackathons.map((h) => h.id))
  const sponsoredOnlyHackathons = sponsoredHackathons.filter(
    (h) => !organizedIds.has(h.id)
  )
  const totalUniqueEvents = organizedHackathons.length + sponsoredOnlyHackathons.length

  return (
    <div>
      <OrgHeader org={tenant} />

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {totalUniqueEvents === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Calendar className="size-10 text-muted-foreground mb-4" />
                  <CardTitle className="mb-2">No events yet</CardTitle>
                  <CardDescription>
                    This organization hasn&apos;t organized or sponsored any public events yet.
                  </CardDescription>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="all">
                    All ({totalUniqueEvents})
                  </TabsTrigger>
                  <TabsTrigger value="organized">
                    Organizing ({organizedHackathons.length})
                  </TabsTrigger>
                  <TabsTrigger value="sponsored">
                    Sponsoring ({sponsoredHackathons.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <HackathonGrid
                    hackathons={[
                      ...organizedHackathons.map((h) => {
                        const isAlsoSponsor = sponsoredHackathons.some((s) => s.id === h.id)
                        return {
                          ...h,
                          role: isAlsoSponsor ? ("both" as const) : ("organizer" as const),
                        }
                      }),
                      ...sponsoredOnlyHackathons.map((h) => ({ ...h, role: "sponsor" as const })),
                    ].sort((a, b) => {
                      if (!a.starts_at && !b.starts_at) return 0
                      if (!a.starts_at) return 1
                      if (!b.starts_at) return -1
                      return new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
                    })}
                  />
                </TabsContent>

                <TabsContent value="organized">
                  {organizedHackathons.length > 0 ? (
                    <HackathonGrid
                      hackathons={organizedHackathons.map((h) => ({
                        ...h,
                        role: "organizer" as const,
                      }))}
                    />
                  ) : (
                    <EmptyState message="This organization hasn't organized any public events yet." />
                  )}
                </TabsContent>

                <TabsContent value="sponsored">
                  {sponsoredHackathons.length > 0 ? (
                    <HackathonGrid
                      hackathons={sponsoredHackathons.map((h) => ({
                        ...h,
                        role: "sponsor" as const,
                      }))}
                    />
                  ) : (
                    <EmptyState message="This organization hasn't sponsored any public events yet." />
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

type HackathonWithRole = {
  id: string
  slug: string
  name: string
  description: string | null
  banner_url: string | null
  status: HackathonStatus
  starts_at: string | null
  ends_at: string | null
  role: "organizer" | "sponsor" | "both"
  organizer?: {
    id: string
    name: string
    slug: string | null
    logo_url: string | null
    logo_url_dark: string | null
  }
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="size-10 text-muted-foreground mb-4" />
        <CardDescription>{message}</CardDescription>
      </CardContent>
    </Card>
  )
}

function HackathonGrid({ hackathons }: { hackathons: HackathonWithRole[] }) {
  return (
    <div className="grid gap-4">
      {hackathons.map((hackathon) => (
        <Link key={hackathon.id} href={`/e/${hackathon.slug}`}>
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{hackathon.name}</CardTitle>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {hackathon.role === "both"
                      ? "Organizer & Sponsor"
                      : hackathon.role === "organizer"
                        ? "Organizer"
                        : "Sponsor"}
                  </Badge>
                  {(() => {
                    const timelineState = getTimelineState({
                      status: hackathon.status,
                      starts_at: hackathon.starts_at,
                      ends_at: hackathon.ends_at,
                    })
                    return (
                      <Badge variant={timelineState.variant}>
                        {timelineState.label}
                      </Badge>
                    )
                  })()}
                </div>
              </div>
              {hackathon.description && (
                <CardDescription className="line-clamp-2">
                  {hackathon.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Calendar className="size-3.5" />
                <span>
                  {formatDateRange(hackathon.starts_at, hackathon.ends_at)}
                </span>
              </div>
            </CardContent>
            {hackathon.role === "sponsor" && hackathon.organizer && (
              <CardFooter>
                <div className="flex items-center gap-2 text-sm">
                  {hackathon.organizer.logo_url && (
                    <OptimizedImage
                      src={hackathon.organizer.logo_url}
                      alt={hackathon.organizer.name}
                      width={16}
                      height={16}
                      className="rounded-full"
                    />
                  )}
                  <span className="text-muted-foreground">
                    by {hackathon.organizer.name}
                  </span>
                </div>
              </CardFooter>
            )}
          </Card>
        </Link>
      ))}
    </div>
  )
}
