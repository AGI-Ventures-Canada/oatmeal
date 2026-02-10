# Oatmeal API Code Samples

Code samples for integrating with the Oatmeal hackathon platform API.

## Authentication

### Public Endpoints (`/api/public/*`)
No authentication required.

### Dashboard Endpoints (`/api/dashboard/*`)
Requires Clerk session (browser) **or** API key:
```
Authorization: Bearer sk_live_your_api_key_here
```

### Integration Endpoints (`/api/v1/*`)
API key only:
```
Authorization: Bearer sk_live_your_api_key_here
```

---

## Public Endpoints

### GET /api/public/health

Returns service health status.

#### curl

```bash
curl "https://your-domain.com/api/public/health"
```

#### Response

```json
{ "status": "ok", "timestamp": "2026-01-15T10:30:00.000Z" }
```

---

### GET /api/public/hackathons

Lists all public hackathons, sorted by status priority (active first). Supports search.

#### curl

```bash
curl "https://your-domain.com/api/public/hackathons"

# With search
curl "https://your-domain.com/api/public/hackathons?q=ai"
```

#### TypeScript

```typescript
async function listHackathons(search?: string) {
  const url = new URL("https://your-domain.com/api/public/hackathons")
  if (search) url.searchParams.set("q", search)

  const res = await fetch(url)
  return res.json()
}
```

#### Response

```json
{
  "hackathons": [
    {
      "id": "uuid",
      "name": "AI Builders Hackathon",
      "slug": "ai-builders-2026",
      "description": "Build AI-powered applications",
      "bannerUrl": "https://storage.example.com/banners/abc.webp",
      "status": "active",
      "startsAt": "2026-02-01T00:00:00Z",
      "endsAt": "2026-02-15T23:59:59Z",
      "registrationOpensAt": "2026-01-15T00:00:00Z",
      "registrationClosesAt": "2026-01-31T23:59:59Z",
      "organizer": {
        "id": "uuid",
        "name": "Acme Corp",
        "slug": "acme",
        "logoUrl": "https://storage.example.com/logos/acme.png"
      }
    }
  ]
}
```

---

### GET /api/public/hackathons/:slug

Returns details for a single hackathon including sponsors.

#### curl

```bash
curl "https://your-domain.com/api/public/hackathons/ai-builders-2026"
```

#### Response

```json
{
  "id": "uuid",
  "name": "AI Builders Hackathon",
  "slug": "ai-builders-2026",
  "description": "Build AI-powered applications",
  "rules": "Markdown rules content...",
  "bannerUrl": "https://storage.example.com/banners/abc.webp",
  "status": "active",
  "startsAt": "2026-02-01T00:00:00Z",
  "endsAt": "2026-02-15T23:59:59Z",
  "registrationOpensAt": "2026-01-15T00:00:00Z",
  "registrationClosesAt": "2026-01-31T23:59:59Z",
  "organizer": {
    "id": "uuid",
    "name": "Acme Corp",
    "slug": "acme",
    "logoUrl": "https://storage.example.com/logos/acme.png"
  },
  "sponsors": [
    {
      "id": "uuid",
      "name": "TechCo",
      "logoUrl": "https://example.com/techco.png",
      "websiteUrl": "https://techco.com",
      "tier": "gold",
      "tenant": {
        "slug": "techco",
        "name": "TechCo",
        "logoUrl": "https://storage.example.com/logos/techco.png"
      }
    }
  ]
}
```

---

### GET /api/public/hackathons/:slug/registration

Returns participant count and current user's registration status.

#### curl

```bash
curl "https://your-domain.com/api/public/hackathons/ai-builders-2026/registration"
```

#### Response

```json
{
  "participantCount": 42,
  "isRegistered": true
}
```

`isRegistered` is `null` when the user is not signed in.

---

### POST /api/public/hackathons/:slug/register

Registers the current user for a hackathon. Requires Clerk session.

#### curl

```bash
curl -X POST "https://your-domain.com/api/public/hackathons/ai-builders-2026/register"
```

#### Response

```json
{ "success": true, "participantId": "uuid" }
```

#### Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `not_authenticated` | 401 | User not signed in |
| `hackathon_not_found` | 404 | Invalid slug |
| `already_registered` | 409 | User already registered |
| `registration_closed` | 400 | Registration period closed |

---

### GET /api/public/hackathons/:slug/submissions

Lists all submissions for a hackathon.

#### curl

```bash
curl "https://your-domain.com/api/public/hackathons/ai-builders-2026/submissions"
```

#### Response

```json
{
  "submissions": [
    {
      "id": "uuid",
      "title": "AI Code Review Bot",
      "description": "Automated code review powered by LLMs",
      "githubUrl": "https://github.com/user/project",
      "liveAppUrl": "https://my-app.vercel.app",
      "demoVideoUrl": null,
      "status": "submitted",
      "createdAt": "2026-02-10T15:30:00Z",
      "submitter": "Jane Smith"
    }
  ]
}
```

---

### POST /api/public/hackathons/:slug/submissions

Creates a submission. Requires Clerk session and hackathon registration.

#### curl

```bash
curl -X POST "https://your-domain.com/api/public/hackathons/ai-builders-2026/submissions" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "AI Code Review Bot",
    "description": "Automated code review powered by LLMs",
    "githubUrl": "https://github.com/user/project",
    "liveAppUrl": "https://my-app.vercel.app"
  }'
```

#### TypeScript

```typescript
async function createSubmission(slug: string, data: {
  title: string
  description: string
  githubUrl: string
  liveAppUrl?: string
}) {
  const res = await fetch(
    `https://your-domain.com/api/public/hackathons/${slug}/submissions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  )
  return res.json()
}
```

#### Validation

- `title`: 1-100 characters
- `description`: 1-280 characters
- `githubUrl`: Must be from github.com
- `liveAppUrl`: Optional

#### Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `not_authenticated` | 401 | User not signed in |
| `hackathon_not_found` | 404 | Invalid slug |
| `submissions_closed` | 400 | Hackathon not in `active` status |
| `not_registered` | 403 | User must register first |
| `already_submitted` | 409 | One submission per user/team |
| `invalid_github_url` | 400 | URL not from github.com |

---

### PATCH /api/public/hackathons/:slug/submissions

Updates an existing submission. Same auth and validation rules as create.

#### curl

```bash
curl -X PATCH "https://your-domain.com/api/public/hackathons/ai-builders-2026/submissions" \
  -H "Content-Type: application/json" \
  -d '{ "title": "Updated Title", "liveAppUrl": "https://new-app.vercel.app" }'
```

All fields are optional. Only provided fields are updated.

---

### GET /api/public/orgs/:slug

Returns an organization's public profile with their hackathons.

#### curl

```bash
curl "https://your-domain.com/api/public/orgs/acme"
```

#### Response

```json
{
  "id": "uuid",
  "name": "Acme Corp",
  "slug": "acme",
  "logoUrl": "https://storage.example.com/logos/acme.png",
  "logoUrlDark": "https://storage.example.com/logos/acme-dark.png",
  "description": "Building the future",
  "websiteUrl": "https://acme.com",
  "organizedHackathons": [...],
  "sponsoredHackathons": [...]
}
```

---

## Dashboard Endpoints

All dashboard endpoints require Clerk session or API key (`Authorization: Bearer sk_live_...`).

### GET /api/dashboard/me

Returns info about the authenticated principal.

#### curl

```bash
curl "https://your-domain.com/api/dashboard/me" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

#### Response (API Key)

```json
{
  "tenantId": "uuid",
  "keyId": "uuid",
  "scopes": ["hackathons:read", "hackathons:write"]
}
```

#### Response (Clerk User)

```json
{
  "tenantId": "uuid",
  "userId": "user_abc",
  "orgId": "org_xyz",
  "orgRole": "org:admin",
  "scopes": ["hackathons:read", "hackathons:write", "keys:read", "keys:write"]
}
```

---

### Hackathon Management

#### GET /api/dashboard/hackathons

Lists hackathons organized by the authenticated tenant.

```bash
curl "https://your-domain.com/api/dashboard/hackathons" \
  -H "Authorization: Bearer sk_live_your_api_key_here"

# With search
curl "https://your-domain.com/api/dashboard/hackathons?q=ai" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

Requires scope: `hackathons:read`

#### POST /api/dashboard/hackathons

Creates a new hackathon.

```bash
curl -X POST "https://your-domain.com/api/dashboard/hackathons" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{ "name": "AI Builders 2026", "description": "Build AI-powered apps" }'
```

Requires scope: `hackathons:write`

**Response:**
```json
{ "id": "uuid", "name": "AI Builders 2026", "slug": "ai-builders-2026" }
```

#### GET /api/dashboard/hackathons/:id

Returns full hackathon details for organizers (includes settings like team sizes).

```bash
curl "https://your-domain.com/api/dashboard/hackathons/{id}" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

Requires scope: `hackathons:read`

#### PATCH /api/dashboard/hackathons/:id/settings

Updates hackathon settings.

```bash
curl -X PATCH "https://your-domain.com/api/dashboard/hackathons/{id}/settings" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "description": "New description",
    "status": "published",
    "startsAt": "2026-03-01T00:00:00Z",
    "endsAt": "2026-03-15T23:59:59Z",
    "registrationOpensAt": "2026-02-15T00:00:00Z",
    "registrationClosesAt": "2026-02-28T23:59:59Z"
  }'
```

Requires scope: `hackathons:write`

**Valid statuses:** `draft`, `published`, `registration_open`, `active`, `judging`, `completed`, `archived`

#### POST /api/dashboard/hackathons/:id/banner

Uploads a hackathon banner image (form data).

```bash
curl -X POST "https://your-domain.com/api/dashboard/hackathons/{id}/banner" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -F "file=@banner.png"
```

Accepted types: PNG, JPEG, WebP. Max size: 50MB.

#### DELETE /api/dashboard/hackathons/:id/banner

Removes the hackathon banner.

---

### Sponsor Management

#### GET /api/dashboard/hackathons/:id/sponsors

Lists sponsors for a hackathon.

#### POST /api/dashboard/hackathons/:id/sponsors

Adds a sponsor.

```bash
curl -X POST "https://your-domain.com/api/dashboard/hackathons/{id}/sponsors" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TechCo",
    "tier": "gold",
    "websiteUrl": "https://techco.com",
    "logoUrl": "https://example.com/techco.png"
  }'
```

**Valid tiers:** `title`, `gold`, `silver`, `bronze`, `partner`

#### PATCH /api/dashboard/hackathons/:id/sponsors/:sponsorId

Updates a sponsor.

#### DELETE /api/dashboard/hackathons/:id/sponsors/:sponsorId

Removes a sponsor.

#### PATCH /api/dashboard/hackathons/:id/sponsors/reorder

Reorders sponsors by display position.

```bash
curl -X PATCH "https://your-domain.com/api/dashboard/hackathons/{id}/sponsors/reorder" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{ "sponsorIds": ["uuid-1", "uuid-2", "uuid-3"] }'
```

---

### Organization Profile

#### GET /api/dashboard/org-profile

Returns the authenticated tenant's profile. Requires scope: `org:read`

#### PATCH /api/dashboard/org-profile

Updates the organization profile.

```bash
curl -X PATCH "https://your-domain.com/api/dashboard/org-profile" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "slug": "acme",
    "description": "Building the future",
    "websiteUrl": "https://acme.com"
  }'
```

Requires scope: `org:write`. Slug uniqueness is validated.

#### POST /api/dashboard/upload-logo

Uploads an organization logo (form data with `variant` field: `light` or `dark`).

```bash
curl -X POST "https://your-domain.com/api/dashboard/upload-logo" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -F "file=@logo.png" \
  -F "variant=light"
```

Accepted types: PNG, JPEG, WebP, SVG. Max size: 2MB.

#### DELETE /api/dashboard/logo/:variant

Deletes a logo variant (`light` or `dark`).

---

### API Key Management (Clerk-only)

#### GET /api/dashboard/keys

Lists API keys for the tenant. Requires scope: `keys:read`

#### POST /api/dashboard/keys

Creates a new API key. Returns the raw key **once**.

```bash
curl -X POST "https://your-domain.com/api/dashboard/keys" \
  -H "Content-Type: application/json" \
  -d '{ "name": "CI Pipeline", "scopes": ["hackathons:read", "hackathons:write"] }'
```

**Response:**
```json
{
  "id": "uuid",
  "name": "CI Pipeline",
  "prefix": "sk_live_abc1",
  "scopes": ["hackathons:read", "hackathons:write"],
  "createdAt": "2026-01-15T10:00:00Z",
  "key": "sk_live_abc1234567890abcdef..."
}
```

Save the `key` value immediately - it cannot be retrieved again.

#### POST /api/dashboard/keys/:id/revoke

Revokes an API key. Requires scope: `keys:write`

---

### Webhooks, Schedules, Jobs

#### Webhooks (`webhooks:read` / `webhooks:write`)
- `GET /api/dashboard/webhooks` - List webhooks
- `POST /api/dashboard/webhooks` - Create webhook
- `DELETE /api/dashboard/webhooks/:id` - Delete webhook

#### Schedules (`schedules:read` / `schedules:write`)
- `GET /api/dashboard/schedules` - List schedules
- `POST /api/dashboard/schedules` - Create schedule
- `GET /api/dashboard/schedules/:id` - Get schedule
- `PATCH /api/dashboard/schedules/:id` - Update schedule
- `DELETE /api/dashboard/schedules/:id` - Delete schedule

#### Jobs
- `GET /api/dashboard/jobs` - List jobs (with `limit`, `offset`)
- `GET /api/dashboard/jobs/:id` - Get job details

---

## v1 Integration Endpoints

All v1 endpoints require API key authentication.

### GET /api/v1/whoami

Returns API key info.

#### curl

```bash
curl "https://your-domain.com/api/v1/whoami" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

#### Response

```json
{ "tenantId": "uuid", "keyId": "uuid", "scopes": ["hackathons:read", "hackathons:write"] }
```

---

### POST /api/v1/jobs

Creates a job and starts workflow execution. Supports idempotency.

#### curl

```bash
curl -X POST "https://your-domain.com/api/v1/jobs" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-request-id-123" \
  -d '{ "type": "sync-event", "input": { "eventId": "abc" } }'
```

#### TypeScript

```typescript
async function createJob(apiKey: string, type: string, input?: Record<string, unknown>) {
  const res = await fetch("https://your-domain.com/api/v1/jobs", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type, input }),
  })
  return res.json()
}
```

#### Python

```python
import requests

def create_job(api_key: str, job_type: str, input_data: dict | None = None) -> dict:
    response = requests.post(
        "https://your-domain.com/api/v1/jobs",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={"type": job_type, "input": input_data},
    )
    response.raise_for_status()
    return response.json()
```

Requires scope: `hackathons:write`

---

### GET /api/v1/jobs/:id

Returns job status. Requires scope: `hackathons:read`

```bash
curl "https://your-domain.com/api/v1/jobs/{id}" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

---

### GET /api/v1/jobs/:id/result

Returns job result. Returns **202** if still running. Requires scope: `hackathons:read`

#### TypeScript (with polling)

```typescript
async function waitForResult(apiKey: string, jobId: string, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`https://your-domain.com/api/v1/jobs/${jobId}/result`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (res.status === 202) {
      await new Promise((r) => setTimeout(r, 1000))
      continue
    }
    return res.json()
  }
  throw new Error("Job timed out")
}
```

---

### POST /api/v1/jobs/:id/cancel

Cancels a queued or running job. Requires scope: `hackathons:write`

---

### Webhooks (v1)

- `GET /api/v1/webhooks` - List webhooks (`webhooks:read`)
- `POST /api/v1/webhooks` - Create webhook, returns secret **once** (`webhooks:write`)
- `DELETE /api/v1/webhooks/:id` - Delete webhook (`webhooks:write`)

---

## Error Handling

All endpoints return errors in this format:

```json
{ "error": "Error message here", "code": "error_code" }
```

Common HTTP status codes:
- `400` - Bad request (invalid input)
- `401` - Unauthorized (missing or invalid auth)
- `403` - Forbidden (missing required scope)
- `404` - Not found
- `409` - Conflict (duplicate resource)
- `429` - Rate limit exceeded
- `500` - Internal server error

### Rate Limiting

When rate limited, the response includes headers:
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

```typescript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options)

    if (response.status === 429) {
      const resetAt = response.headers.get("X-RateLimit-Reset")
      const waitMs = resetAt
        ? Math.max(0, Number(resetAt) * 1000 - Date.now())
        : 1000 * (i + 1)
      await new Promise(resolve => setTimeout(resolve, waitMs))
      continue
    }

    return response
  }
  throw new Error("Max retries exceeded")
}
```
