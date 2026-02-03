import { notFound } from "next/navigation"
import Link from "next/link"
import { getPublicTenantWithHackathons } from "@/lib/services/tenant-profiles"
import { OrgHeader } from "@/components/org/org-header"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Metadata } from "next"

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const tenant = await getPublicTenantWithHackathons(slug)

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
  const tenant = await getPublicTenantWithHackathons(slug)

  if (!tenant) {
    notFound()
  }

  return (
    <div>
      <OrgHeader org={tenant} />

      {tenant.hackathons.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl font-bold mb-6">Hackathons</h2>
              <div className="grid gap-4">
                {tenant.hackathons.map((hackathon) => (
                  <Link key={hackathon.id} href={`/e/${hackathon.slug}`}>
                    <Card className="hover:bg-muted/50 transition-colors">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>{hackathon.name}</CardTitle>
                          <Badge variant="secondary">{hackathon.status}</Badge>
                        </div>
                        {hackathon.description && (
                          <CardDescription className="line-clamp-2">
                            {hackathon.description}
                          </CardDescription>
                        )}
                        {hackathon.starts_at && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(hackathon.starts_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
