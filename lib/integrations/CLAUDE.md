# OAuth Integrations

This directory contains OAuth flow handlers for third-party integrations.

## Overview

Orgs can connect external services (Gmail, Calendar, Notion, Luma) via OAuth. Tokens are encrypted and stored in `org_integrations`, automatically refreshed when expired.

## Supported Providers

| Provider | Scopes | Env Vars Required |
|----------|--------|-------------------|
| Gmail | `gmail.modify` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Google Calendar | `calendar` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Notion | (internal) | `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET` |
| Luma | `read`, `write` | `LUMA_CLIENT_ID`, `LUMA_CLIENT_SECRET` |

## OAuth Flow

### 1. Generate Auth URL

```typescript
import { buildAuthUrl } from "@/lib/integrations/oauth"

const state = Buffer.from(JSON.stringify({
  tenantId: "...",
  userId: "...",
})).toString("base64url")

const authUrl = buildAuthUrl("gmail", state)
// Redirect user to authUrl
```

### 2. Handle Callback

The callback is handled at `/api/public/integrations/:provider/callback`:
- Validates state
- Exchanges code for tokens
- Stores encrypted tokens in `org_integrations`

### 3. Use Integration

```typescript
import { getIntegration, getDecryptedAccessToken } from "@/lib/integrations/oauth"

const integration = await getIntegration(tenantId, "gmail")
const token = await getDecryptedAccessToken(integration)
// Token is auto-refreshed if expired
```

## Token Management

### Encryption

Tokens are encrypted with AES-256-GCM using `ENCRYPTION_KEY`:

```typescript
import { encryptToken, decryptToken } from "@/lib/services/encryption"

const encrypted = encryptToken(accessToken)  // Store this
const decrypted = decryptToken(encrypted)    // Use at runtime
```

### Auto-Refresh

`getDecryptedAccessToken()` automatically refreshes expired tokens:
- Checks `token_expires_at` with 5-minute buffer
- Calls refresh token endpoint
- Updates stored tokens
- Returns new access token

## For Agent Execution

Agents can request integration tokens for their sandbox:

```typescript
import { getIntegrationTokensForSandbox } from "@/lib/integrations/oauth"

const tokens = await getIntegrationTokensForSandbox(
  tenantId,
  ["gmail", "notion"]
)
// Returns: { GMAIL_ACCESS_TOKEN: "...", NOTION_ACCESS_TOKEN: "..." }
```

These tokens are passed as environment variables to the sandbox.

## Adding New Providers

1. Add provider config in `OAUTH_PROVIDERS`:
```typescript
my_provider: () => ({
  name: "my_provider",
  authUrl: "https://...",
  tokenUrl: "https://...",
  scopes: ["read", "write"],
  clientId: process.env.MY_PROVIDER_CLIENT_ID,
  clientSecret: process.env.MY_PROVIDER_CLIENT_SECRET,
})
```

2. Add to `IntegrationProvider` enum in migration
3. Handle provider-specific token exchange if needed
4. Add environment variables

## Documentation Links

### Google OAuth
- https://developers.google.com/identity/protocols/oauth2/web-server

### Notion OAuth
- https://developers.notion.com/docs/authorization

### Luma API
- https://docs.luma.com/reference/getting-started-with-your-api
- https://help.luma.com/p/luma-api
