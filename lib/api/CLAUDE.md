# Elysia API Layer

This directory contains the Elysia API server for the Oatmeal hackathon platform, handling all `/api/*` routes.

## Architecture

All API routes are handled by a single Elysia instance via a Next.js catch-all route:
- `app/api/[[...slugs]]/route.ts` delegates to Elysia
- Elysia instance defined in `lib/api/index.ts`

## Route Namespaces

```
/api/public/*     → No auth (anon) — browse hackathons, register, submit projects
/api/dashboard/*  → Clerk user OR API key (dual-auth) — manage hackathons, org settings
/api/v1/*         → API key only — programmatic access for jobs, webhooks
```

**Note:** Most endpoints in `/api/dashboard/*` support both auth methods with appropriate scope requirements. Exceptions that remain Clerk-only:
- `/keys`, `/keys/:id/revoke` - API key management (security)
- `/integrations/*` - OAuth requires user browser flow
- `/credentials/*` - Contains sensitive secrets
- `/hackathons/participating`, `/hackathons/sponsored` - User-specific views
- `/organizations/search` - User-specific search

## Key Patterns

### Elysia + Next.js Integration
```typescript
import { Elysia } from "elysia"

const api = new Elysia({ prefix: "/api" })
  .get("/public/health", () => ({ status: "ok" }))

export const GET = api.fetch
export const POST = api.fetch
```

**Critical:** `prefix` must match the route path (`/api` for `app/api/[[...slugs]]/route.ts`)

### Clerk Auth (use @clerk/nextjs, NOT elysia-clerk)
Since Elysia runs inside Next.js runtime, use `@clerk/nextjs/server` directly:
```typescript
import { auth } from "@clerk/nextjs/server"

.get("/dashboard/me", async () => {
  const { userId, orgId } = await auth()
  if (!userId) throw new Error("Unauthorized")
  return { userId, orgId }
})
```

### Child Route Derive Hooks and Auth Caching

**CRITICAL: Never call `resolvePrincipal()` in child route `.derive()` hooks without the per-request cache.**

When a child Elysia instance (e.g., `dashboardJudgingRoutes`) is `.use()`'d into a parent that already has a `.derive()` calling `resolvePrincipal()`, Elysia runs **both** derives. The second `resolvePrincipal()` call can fail in Elysia's async context, silently overwriting the valid principal with `{ kind: "anon" }` and causing `Unauthorized` errors.

`resolvePrincipal()` in `lib/auth/principal.ts` uses a `WeakMap<Request, Principal>` cache to ensure auth resolves only once per request. **Do not bypass or duplicate this pattern.** If you extract routes into a new child file:

1. Keep the `.derive()` with `resolvePrincipal()` for TypeScript type inference — the cache makes it a no-op on the second call
2. Never inline the auth logic directly (skipping the cache)
3. Never create a parallel auth resolution function

### UUID Validation for Route Parameters

**CRITICAL: All `:id` route parameters that query UUID columns must be validated before hitting the database.**

The `hackathons.id` column (and most primary keys) are `uuid` type. If a non-UUID string like `"draft"` reaches PostgreSQL via `.eq("id", value)`, it throws `invalid input syntax for type uuid` which cascades as a 500 error.

`checkHackathonOrganizer()` in `lib/services/public-hackathons.ts` validates with `isValidUuid()` from `lib/utils/uuid.ts`. When adding new routes that query by ID:

1. Always route through `checkHackathonOrganizer()` for hackathon IDs — it validates UUID format and ownership in one call
2. For non-hackathon UUID params, call `isValidUuid(params.id)` and return 404 early if invalid
3. Never pass unvalidated route params directly to `.eq("id", ...)` queries
4. In tests, use valid UUID strings (e.g., `"11111111-1111-1111-1111-111111111111"`) not short placeholders like `"h1"`

This matters because the `HackathonDraftEditor` component uses `id: "draft"` as a placeholder before persistence — any component rendering during draft mode could trigger API calls with this non-UUID ID.

### AI SDK Streaming
```typescript
import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"

.get("/chat", () => {
  const stream = streamText({
    model: openai("gpt-4o"),
    prompt: "Hello"
  })
  return stream.textStream
})

import { sse } from "elysia"
.get("/chat-sse", () => {
  const stream = streamText({...})
  return sse(stream.textStream)
})
```

### Type Safety with Eden
Export `Api` type for end-to-end type safety:
```typescript
export type Api = typeof api
```

### Unit Testing
Use `Elysia.handle()` with Web Standard Request/Response:
```typescript
import { describe, expect, it } from "bun:test"
import { api } from "@/lib/api"

describe("API", () => {
  it("health check returns ok", async () => {
    const res = await api.handle(
      new Request("http://localhost/api/public/health")
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.status).toBe("ok")
  })
})
```

**Critical:** Use fully-formed URLs (`http://localhost/api/...`), not relative paths.

Run tests: `bun test`

## API Key Security

### How API Keys Work

Integration clients authenticate with API keys (`sk_live_...`). We never store raw keys:

```
User creates key → We return raw key ONCE → Store only prefix + HMAC hash
User calls API  → We hash incoming key  → Compare against stored hash
```

**Storage format:**
- `prefix`: First 12 chars (e.g., `sk_live_abc1`) - for quick lookup
- `hash`: HMAC-SHA256(API_KEY_SECRET, full_key) - for verification

### API_KEY_SECRET Environment Variable

This is the server-side secret used to hash API keys. **Critical security considerations:**

| Concern | Implication |
|---------|-------------|
| Must be consistent | If it changes, ALL existing API keys become invalid |
| Must be secret | If leaked, attackers can forge valid key hashes |
| Must be strong | Use 256-bit (64 hex chars) minimum |

### Environment Setup by Scenario

**Local Development:**
- Auto-generated by `bun dev` script if not present
- Stored in `.env.local`
- Safe to regenerate (local DB resets clear keys anyway)

**Production (Vercel):**
1. Generate once: `openssl rand -hex 32`
2. Add to Vercel: Dashboard → Project → Settings → Environment Variables
3. Name: `API_KEY_SECRET`, Environment: Production
4. **NEVER rotate** unless you plan to invalidate all keys

**Preview/Staging:**
- Option A: Use same secret as production (keys work across environments)
- Option B: Use different secret (keys are environment-specific)
- Set in Vercel environment variables for Preview environment

### Key Rotation (Emergency Only)

If API_KEY_SECRET is compromised:

1. Generate new secret
2. Update in Vercel (causes immediate invalidation)
3. Notify all integration users to regenerate their keys
4. Old keys will return 401 Unauthorized

There is NO gradual migration path - rotation is immediate and breaking.

### Implementation Reference

Key creation: `lib/services/api-keys.ts`
```typescript
const raw = `sk_live_${randomBytes(24).toString("hex")}`
const prefix = raw.slice(0, 12)
const hash = createHmac("sha256", API_KEY_SECRET).update(raw).digest("hex")
// Store prefix + hash, return raw to user ONCE
```

Key verification: `lib/auth/principal.ts`
```typescript
const prefix = bearerToken.slice(0, 12)
const hash = createHmac("sha256", API_KEY_SECRET).update(bearerToken).digest("hex")
// Lookup by prefix + hash
```

## API Documentation Maintenance

**CRITICAL: When adding or modifying API endpoints, you MUST update the documentation:**

1. **Swagger details** - Add `detail` property with `summary` and `description`:
```typescript
.get("/endpoint", handler, {
  detail: {
    summary: "Short description",
    description: "Detailed explanation of what the endpoint does.",
  },
})
```

2. **Code samples** - Update `lib/api/API_SAMPLES.md` with examples for:
   - curl
   - TypeScript
   - Python

3. **Request/response types** - Document body parameters with descriptions:
```typescript
body: t.Object({
  field: t.String({ description: "What this field is for" }),
})
```

## Documentation
- Elysia + Next.js: https://elysiajs.com/integrations/nextjs
- Elysia + AI SDK: https://elysiajs.com/integrations/ai-sdk.html
- Unit Testing: https://elysiajs.com/patterns/unit-test.html
- Clerk + Next.js: https://clerk.com/docs/reference/nextjs/overview
