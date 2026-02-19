import { OptimizedImage } from "@/components/ui/optimized-image"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import type { TenantProfile } from "@/lib/db/hackathon-types"

interface OrgHeaderProps {
  org: Pick<TenantProfile, "name" | "logo_url" | "logo_url_dark" | "description" | "website_url">
}

export function OrgHeader({ org }: OrgHeaderProps) {
  return (
    <div className="py-12 border-b">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 max-w-3xl mx-auto">
          <div className="relative h-24 w-24 shrink-0 bg-muted flex items-center justify-center">
            {org.logo_url ? (
              <>
                <OptimizedImage
                  src={org.logo_url}
                  alt={org.name}
                  fill
                  className="object-contain p-2 dark:hidden"
                />
                <OptimizedImage
                  src={org.logo_url_dark || org.logo_url}
                  alt={org.name}
                  fill
                  className="object-contain p-2 hidden dark:block"
                />
              </>
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">
                {org.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex flex-col items-center md:items-start gap-2 text-center md:text-left">
            <h1 className="text-3xl font-bold">{org.name}</h1>
            {org.description && (
              <p className="text-muted-foreground max-w-xl">{org.description}</p>
            )}
            {org.website_url && (
              <Link
                href={org.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary flex items-center gap-1 hover:underline"
              >
                {new URL(org.website_url).hostname}
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
