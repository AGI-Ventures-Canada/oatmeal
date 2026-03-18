import { resolvePageTenant } from "@/lib/services/tenants"
import { getPublicTenantById } from "@/lib/services/tenant-profiles"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { ProfileForm, ClerkSettingsCard } from "./profile-form"

export default async function SettingsProfilePage() {
  const tenant = await resolvePageTenant()
  const profile = await getPublicTenantById(tenant.id)

  if (!profile) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Organization Profile"
          description="Unable to load organization profile"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Profile"
        description="Customize your organization's public appearance"
      />

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
