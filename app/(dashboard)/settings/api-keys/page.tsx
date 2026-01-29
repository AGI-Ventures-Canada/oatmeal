import { ApiKeyTable } from "@/components/dashboard/api-key-table"
import { ApiKeyCreateDialog } from "@/components/dashboard/api-key-create-dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { listApiKeys } from "@/lib/services/api-keys"
import { resolvePageTenant } from "@/lib/services/tenants"
import type { ApiKeyDisplay } from "@/lib/types/dashboard"
import { AutoRefresh } from "@/components/ui/auto-refresh"

export default async function SettingsApiKeysPage() {
  const tenant = await resolvePageTenant()

  const apiKeys = await listApiKeys(tenant.id)

  const keys: ApiKeyDisplay[] = apiKeys.map((k) => ({
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    scopes: k.scopes,
    createdAt: k.created_at,
    lastUsedAt: k.last_used_at,
    revokedAt: k.revoked_at,
  }))

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">
            Manage your API keys for external integrations
          </p>
        </div>
        <ApiKeyCreateDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>
            API keys allow external services to authenticate with your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeyTable keys={keys} />
        </CardContent>
      </Card>
    </div>
  )
}
