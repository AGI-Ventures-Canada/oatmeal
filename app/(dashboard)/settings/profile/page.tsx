import { resolvePageTenant } from "@/lib/services/tenants"
import { getPublicTenantById } from "@/lib/services/tenant-profiles"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ProfileForm, ClerkSettingsCard } from "./profile-form"

export default async function SettingsProfilePage() {
  const tenant = await resolvePageTenant()
  const profile = await getPublicTenantById(tenant.id)

  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Organization Profile</h1>
          <p className="text-muted-foreground">
            Unable to load organization profile
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Organization Profile</h1>
        <p className="text-muted-foreground">
          Customize your organization&apos;s public appearance
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Public Profile</CardTitle>
          <CardDescription>
            This information appears on your public event pages and sponsor cards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initialData={{
              name: profile.name,
              slug: profile.slug,
              logoUrl: profile.logo_url,
              logoUrlDark: profile.logo_url_dark,
              description: profile.description,
              websiteUrl: profile.website_url,
            }}
          />
        </CardContent>
      </Card>

      <ClerkSettingsCard />
    </div>
  )
}
