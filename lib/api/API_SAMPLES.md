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

### GET /api/public/hackathons/:slug/submissions/me

Returns the authenticated user's submission for a hackathon. Returns `null` if not signed in or no submission exists.

#### curl

```bash
curl "https://your-domain.com/api/public/hackathons/ai-builders-2026/submissions/me"
```

#### Response

```json
{
  "submission": {
    "id": "uuid",
    "title": "AI Code Review Bot",
    "description": "Automated code review powered by LLMs",
    "githubUrl": "https://github.com/user/project",
    "liveAppUrl": "https://my-app.vercel.app",
    "screenshotUrl": "https://storage.example.com/screenshots/abc.webp",
    "status": "submitted",
    "createdAt": "2026-02-10T15:30:00Z",
    "updatedAt": "2026-02-12T08:00:00Z"
  }
}
```

---

### POST /api/public/hackathons/:slug/submissions/screenshot

Uploads a screenshot image for the user's submission. Requires Clerk session and existing submission.

#### curl

```bash
curl -X POST "https://your-domain.com/api/public/hackathons/ai-builders-2026/submissions/screenshot" \
  -F "file=@screenshot.png"
```

Accepted types: PNG, JPEG, WebP. Max size: 10MB.

#### Response

```json
{ "success": true, "screenshotUrl": "https://storage.example.com/screenshots/abc.webp" }
```

---

### DELETE /api/public/hackathons/:slug/submissions/screenshot

Removes the screenshot from the user's submission. Requires Clerk session.

```bash
curl -X DELETE "https://your-domain.com/api/public/hackathons/ai-builders-2026/submissions/screenshot"
```

---

### GET /api/public/invitations/:token

Returns team invitation details by token.

#### curl

```bash
curl "https://your-domain.com/api/public/invitations/abc123token"
```

#### Response

```json
{
  "id": "uuid",
  "status": "pending",
  "teamName": "BuilderSquad",
  "hackathonName": "AI Builders Hackathon",
  "hackathonSlug": "ai-builders-2026",
  "hackathonStatus": "active",
  "email": "invitee@example.com",
  "expiresAt": "2026-02-20T00:00:00Z"
}
```

Status values: `pending`, `accepted`, `declined`, `expired`, `cancelled`

---

### POST /api/public/invitations/:token/accept

Accepts a team invitation and joins the team. Requires Clerk session.

```bash
curl -X POST "https://your-domain.com/api/public/invitations/abc123token/accept"
```

**Response:**
```json
{ "success": true, "teamId": "uuid", "hackathonSlug": "ai-builders-2026" }
```

---

### POST /api/public/invitations/:token/decline

Declines a team invitation. Requires Clerk session.

```bash
curl -X POST "https://your-domain.com/api/public/invitations/abc123token/decline"
```

---

### GET /api/public/hackathons/:slug/judging/assignments

Returns the authenticated judge's assignments for a hackathon. Requires Clerk session.

#### curl

```bash
curl "https://your-domain.com/api/public/hackathons/ai-builders-2026/judging/assignments"
```

#### Response

```json
{
  "assignments": [
    {
      "id": "uuid",
      "submissionId": "uuid",
      "submissionTitle": "AI Code Review Bot",
      "submissionDescription": "Automated code review powered by LLMs",
      "submissionGithubUrl": "https://github.com/user/project",
      "submissionLiveAppUrl": "https://my-app.vercel.app",
      "submissionScreenshotUrl": null,
      "teamName": "BuilderSquad",
      "isComplete": false,
      "notes": null
    }
  ]
}
```

`teamName` is `null` when anonymous judging is enabled.

---

### GET /api/public/hackathons/:slug/judging/assignments/:assignmentId

Returns full details for a specific judging assignment including criteria and scores.

```bash
curl "https://your-domain.com/api/public/hackathons/ai-builders-2026/judging/assignments/{assignmentId}"
```

---

### POST /api/public/hackathons/:slug/judging/assignments/:assignmentId/scores

Submits scores for a judging assignment. Hackathon must be in `judging` phase.

#### curl

```bash
curl -X POST "https://your-domain.com/api/public/hackathons/ai-builders-2026/judging/assignments/{assignmentId}/scores" \
  -H "Content-Type: application/json" \
  -d '{
    "scores": [
      { "criteriaId": "uuid-1", "score": 8 },
      { "criteriaId": "uuid-2", "score": 9 }
    ],
    "notes": "Excellent implementation, clean code"
  }'
```

#### Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `not_authenticated` | 401 | User not signed in |
| `not_judging` | 400 | Hackathon not in judging phase |

---

### PATCH /api/public/hackathons/:slug/judging/assignments/:assignmentId/notes

Saves private notes for a judging assignment.

```bash
curl -X PATCH "https://your-domain.com/api/public/hackathons/ai-builders-2026/judging/assignments/{assignmentId}/notes" \
  -H "Content-Type: application/json" \
  -d '{ "notes": "Good project but needs better docs" }'
```

---

### GET /api/public/judge-invitations/:token

Returns judge invitation details by token.

#### curl

```bash
curl "https://your-domain.com/api/public/judge-invitations/abc123token"
```

#### Response

```json
{
  "id": "uuid",
  "status": "pending",
  "hackathonName": "AI Builders Hackathon",
  "hackathonSlug": "ai-builders-2026",
  "email": "judge@example.com",
  "expiresAt": "2026-02-20T00:00:00Z"
}
```

---

### POST /api/public/judge-invitations/:token/accept

Accepts a judge invitation and adds the user as a judge. Requires Clerk session.

```bash
curl -X POST "https://your-domain.com/api/public/judge-invitations/abc123token/accept"
```

**Response:**
```json
{ "success": true, "hackathonSlug": "ai-builders-2026" }
```

---

### POST /api/public/judge-invitations/:token/decline

Declines a judge invitation. Requires Clerk session.

```bash
curl -X POST "https://your-domain.com/api/public/judge-invitations/abc123token/decline"
```

---

### GET /api/public/hackathons/:slug/results

Returns published results and rankings for a hackathon. Returns 404 if results are not yet published.

#### curl

```bash
curl "https://your-domain.com/api/public/hackathons/ai-builders-2026/results"
```

#### Response

```json
{
  "results": [
    {
      "rank": 1,
      "submissionTitle": "AI Code Review Bot",
      "teamName": "BuilderSquad",
      "weightedScore": 92.5,
      "judgeCount": 3,
      "prizes": ["Best Overall", "Most Innovative"]
    }
  ]
}
```

---

### GET /api/public/hackathons/:slug/announcements

Returns published announcements for a hackathon, ordered by most recent first. Excludes drafts and future-scheduled announcements.

#### curl

```bash
curl "https://your-domain.com/api/public/hackathons/ai-builders-2026/announcements"
```

#### TypeScript

```typescript
const res = await fetch(`https://your-domain.com/api/public/hackathons/${slug}/announcements`)
const { announcements } = await res.json()
```

#### Python

```python
import requests

response = requests.get(f"https://your-domain.com/api/public/hackathons/{slug}/announcements")
announcements = response.json()["announcements"]
```

#### Response

```json
{
  "announcements": [
    {
      "id": "uuid",
      "title": "Submission deadline extended",
      "body": "You have an extra hour to submit your projects!",
      "priority": "urgent",
      "audience": "everyone",
      "published_at": "2026-04-28T14:00:00Z"
    }
  ]
}
```

---

### GET /api/public/hackathons/:slug/schedule

Returns all schedule items for a hackathon, ordered by start time.

#### curl

```bash
curl "https://your-domain.com/api/public/hackathons/ai-builders-2026/schedule"
```

#### TypeScript

```typescript
const res = await fetch(`https://your-domain.com/api/public/hackathons/${slug}/schedule`)
const { scheduleItems } = await res.json()
```

#### Python

```python
import requests

response = requests.get(f"https://your-domain.com/api/public/hackathons/{slug}/schedule")
schedule_items = response.json()["scheduleItems"]
```

#### Response

```json
{
  "scheduleItems": [
    {
      "id": "uuid",
      "title": "Opening Ceremony",
      "description": "Welcome and kickoff",
      "starts_at": "2026-04-28T09:00:00Z",
      "ends_at": "2026-04-28T09:30:00Z",
      "location": "Main Hall",
      "sort_order": 0
    }
  ]
}
```

---

### POST /api/public/import/luma

Extracts structured event data from a public Luma event page by parsing JSON-LD metadata.

#### curl

```bash
curl -X POST "https://your-domain.com/api/public/import/luma" \
  -H "Content-Type: application/json" \
  -d '{"slug": "sfagents"}'
```

#### TypeScript

```typescript
const response = await fetch("https://your-domain.com/api/public/import/luma", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ slug: "sfagents" })
})

const eventData = await response.json()
```

#### Python

```python
import requests

response = requests.post(
    "https://your-domain.com/api/public/import/luma",
    json={"slug": "sfagents"}
)

event_data = response.json()
```

#### Request Body

```json
{
  "slug": "sfagents"
}
```

**Parameters:**
- `slug` (string, required): Luma event slug from the URL (e.g., "sfagents" from `luma.com/sfagents`)

#### Response (200 OK)

```json
{
  "name": "Autonomous Agents Hackathon",
  "description": "Build AI agents that work autonomously...",
  "startsAt": "2026-02-27T09:30:00.000-08:00",
  "endsAt": "2026-02-27T19:30:00.000-08:00",
  "locationType": "in_person",
  "locationName": "San Francisco, California",
  "locationUrl": null,
  "imageUrl": "https://images.lumacdn.com/cdn-cgi/image/.../event-covers/..."
}
```

#### Response (404 Not Found)

```json
{
  "error": "Could not extract event data from Luma"
}
```

**Note:** Returns 404 if the Luma event doesn't exist, is private, or the page structure has changed.

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

#### POST /api/dashboard/import/luma

Creates a new hackathon from imported Luma event data. Extracts the event metadata, downloads the banner image, and creates a fully configured hackathon.

##### curl

```bash
curl -X POST "https://your-domain.com/api/dashboard/import/luma" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -d '{
    "name": "Autonomous Agents Hackathon",
    "description": "Build AI agents that work autonomously...",
    "startsAt": "2026-02-27T09:30:00.000-08:00",
    "endsAt": "2026-02-27T19:30:00.000-08:00",
    "locationType": "in_person",
    "locationName": "San Francisco, California",
    "locationUrl": null,
    "imageUrl": "https://images.lumacdn.com/cdn-cgi/image/.../event-covers/..."
  }'
```

##### TypeScript

```typescript
const response = await fetch("https://your-domain.com/api/dashboard/import/luma", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer sk_live_your_api_key_here"
  },
  body: JSON.stringify({
    name: "Autonomous Agents Hackathon",
    description: "Build AI agents that work autonomously...",
    startsAt: "2026-02-27T09:30:00.000-08:00",
    endsAt: "2026-02-27T19:30:00.000-08:00",
    locationType: "in_person",
    locationName: "San Francisco, California",
    locationUrl: null,
    imageUrl: "https://images.lumacdn.com/cdn-cgi/image/.../event-covers/..."
  })
})

const hackathon = await response.json()
```

##### Python

```python
import requests

response = requests.post(
    "https://your-domain.com/api/dashboard/import/luma",
    headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer sk_live_your_api_key_here"
    },
    json={
        "name": "Autonomous Agents Hackathon",
        "description": "Build AI agents that work autonomously...",
        "startsAt": "2026-02-27T09:30:00.000-08:00",
        "endsAt": "2026-02-27T19:30:00.000-08:00",
        "locationType": "in_person",
        "locationName": "San Francisco, California",
        "locationUrl": None,
        "imageUrl": "https://images.lumacdn.com/cdn-cgi/image/.../event-covers/..."
    }
)

hackathon = response.json()
```

##### Request Body

```json
{
  "name": "Autonomous Agents Hackathon",
  "description": "Build AI agents that work autonomously...",
  "startsAt": "2026-02-27T09:30:00.000-08:00",
  "endsAt": "2026-02-27T19:30:00.000-08:00",
  "locationType": "in_person",
  "locationName": "San Francisco, California",
  "locationUrl": null,
  "imageUrl": "https://images.lumacdn.com/cdn-cgi/image/.../event-covers/..."
}
```

**Parameters:**
- `name` (string, required): Hackathon name
- `description` (string, optional): Full description of the hackathon
- `startsAt` (string, optional): ISO 8601 datetime for hackathon start
- `endsAt` (string, optional): ISO 8601 datetime for hackathon end
- `locationType` (string, optional): Either `"in_person"` or `"virtual"`
- `locationName` (string, optional): Human-readable location name
- `locationUrl` (string, optional): URL for virtual events or location details
- `imageUrl` (string, optional): URL of the banner image to download and import

##### Response (200 OK)

```json
{
  "id": "uuid",
  "name": "Autonomous Agents Hackathon",
  "slug": "autonomous-agents-hackathon"
}
```

##### Response (401 Unauthorized)

```json
{
  "error": "Unauthorized"
}
```

##### Response (500 Internal Server Error)

```json
{
  "error": "Failed to create hackathon"
}
```

**Note:** The banner image (if provided) is downloaded, optimized, and uploaded to storage. If the download fails, the hackathon is still created but without a banner. This endpoint requires the `hackathons:write` scope.

---

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
    "registrationClosesAt": "2026-02-28T23:59:59Z",
    "maxParticipants": 200,
    "minTeamSize": 2,
    "maxTeamSize": 5,
    "allowSolo": false,
    "judgingMode": "points"
  }'
```

Requires scope: `hackathons:write`

**Valid statuses:** `draft`, `published`, `registration_open`, `active`, `judging`, `completed`, `archived`

**Team/participant fields:**
| Field | Type | Description |
|-------|------|-------------|
| `maxParticipants` | `number \| null` | Maximum number of participants (null = unlimited) |
| `minTeamSize` | `number` | Minimum team size |
| `maxTeamSize` | `number` | Maximum team size |
| `allowSolo` | `boolean` | Whether solo participation is allowed |
| `judgingMode` | `"points" \| "subjective"` | Judging mode |

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

### Judge Display Profiles

Manage the public-facing judge profiles shown on hackathon pages. These are separate from judge operational records (assignments, invitations).

#### GET /api/dashboard/hackathons/:id/judges/display

Lists all judge display profiles. Requires scope: `hackathons:read`

```bash
curl "https://your-domain.com/api/dashboard/hackathons/{id}/judges/display" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

**Response:**
```json
{
  "judges": [
    {
      "id": "uuid",
      "name": "Jane Smith",
      "title": "VP of Engineering",
      "organization": "Acme Corp",
      "headshotUrl": "https://storage.example.com/headshots/uuid.webp",
      "clerkUserId": "user_abc123",
      "participantId": null,
      "displayOrder": 0,
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

#### POST /api/dashboard/hackathons/:id/judges/display

Creates a judge display profile. Requires scope: `hackathons:write`

```bash
curl -X POST "https://your-domain.com/api/dashboard/hackathons/{id}/judges/display" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "title": "VP of Engineering",
    "organization": "Acme Corp",
    "email": "jane@acme.com"
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Jane Smith",
  "headshotUrl": null,
  "clerkUserId": null,
  "displayOrder": 0
}
```

#### PATCH /api/dashboard/hackathons/:id/judges/display/:judgeId

Updates a judge display profile. Requires scope: `hackathons:write`

```bash
curl -X PATCH "https://your-domain.com/api/dashboard/hackathons/{id}/judges/display/{judgeId}" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{ "title": "CTO", "organization": "New Corp" }'
```

#### DELETE /api/dashboard/hackathons/:id/judges/display/:judgeId

Deletes a judge display profile. Requires scope: `hackathons:write`

```bash
curl -X DELETE "https://your-domain.com/api/dashboard/hackathons/{id}/judges/display/{judgeId}" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

#### POST /api/dashboard/hackathons/:id/judges/display/reorder

Reorders judge display profiles. Requires scope: `hackathons:write`

```bash
curl -X POST "https://your-domain.com/api/dashboard/hackathons/{id}/judges/display/reorder" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{ "orderedIds": ["judge-id-2", "judge-id-1", "judge-id-3"] }'
```

#### POST /api/dashboard/hackathons/:id/judges/display/:judgeId/headshot

Uploads a headshot for a judge display profile (form data). Requires scope: `hackathons:write`

```bash
curl -X POST "https://your-domain.com/api/dashboard/hackathons/{id}/judges/display/{judgeId}/headshot" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -F "file=@headshot.jpg"
```

Accepted types: PNG, JPEG, WebP. Max size: 5MB.

**Response:**
```json
{ "success": true, "headshotUrl": "https://storage.example.com/headshots/uuid.webp" }
```

#### DELETE /api/dashboard/hackathons/:id/judges/display/:judgeId/headshot

Removes the headshot from a judge display profile. Requires scope: `hackathons:write`

```bash
curl -X DELETE "https://your-domain.com/api/dashboard/hackathons/{id}/judges/display/{judgeId}/headshot" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

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

### Hackathon Views (Clerk-only)

#### GET /api/dashboard/hackathons/participating

Lists hackathons the current user is participating in. Clerk-only.

```bash
curl "https://your-domain.com/api/dashboard/hackathons/participating"
```

#### GET /api/dashboard/hackathons/sponsored

Lists hackathons sponsored by the tenant. Clerk-only.

```bash
curl "https://your-domain.com/api/dashboard/hackathons/sponsored"
```

#### GET /api/dashboard/hackathons/judging

Lists hackathons where the current user is a judge. Clerk-only.

```bash
curl "https://your-domain.com/api/dashboard/hackathons/judging"
```

#### GET /api/dashboard/organizations/search

Searches organizations by name. Clerk-only.

```bash
curl "https://your-domain.com/api/dashboard/organizations/search?q=acme"
```

**Response:**
```json
{
  "organizations": [
    { "id": "uuid", "name": "Acme Corp", "slug": "acme", "logoUrl": "...", "websiteUrl": "..." }
  ]
}
```

---

### Team Invitations (Clerk-only)

#### POST /api/dashboard/teams/:teamId/invitations

Sends an email invitation to join a team. Rate limited (10/minute per team).

```bash
curl -X POST "https://your-domain.com/api/dashboard/teams/{teamId}/invitations" \
  -H "Content-Type: application/json" \
  -d '{
    "hackathonId": "uuid",
    "email": "teammate@example.com",
    "inviterName": "Jane Smith"
  }'
```

**Response:**
```json
{ "id": "uuid", "email": "teammate@example.com", "expiresAt": "2026-02-20T00:00:00Z", "emailSent": true }
```

#### GET /api/dashboard/teams/:teamId/invitations

Lists invitations for a team. Supports `?status=pending` filter.

```bash
curl "https://your-domain.com/api/dashboard/teams/{teamId}/invitations?status=pending"
```

#### DELETE /api/dashboard/teams/:teamId/invitations/:invitationId

Cancels a pending team invitation.

```bash
curl -X DELETE "https://your-domain.com/api/dashboard/teams/{teamId}/invitations/{invitationId}"
```

---

### Integrations (Clerk-only)

#### GET /api/dashboard/integrations

Lists OAuth integrations for the tenant.

```bash
curl "https://your-domain.com/api/dashboard/integrations"
```

**Response:**
```json
{
  "integrations": [
    {
      "id": "uuid",
      "provider": "luma",
      "accountEmail": "user@example.com",
      "isActive": true,
      "scopes": ["read", "write"],
      "tokenExpiresAt": "2026-03-01T00:00:00Z",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

#### GET /api/dashboard/integrations/:provider/auth-url

Returns the OAuth authorization URL for a provider.

```bash
curl "https://your-domain.com/api/dashboard/integrations/luma/auth-url"
```

**Response:**
```json
{ "authUrl": "https://api.lu.ma/oauth/authorize?..." }
```

#### DELETE /api/dashboard/integrations/:provider

Removes an OAuth integration.

```bash
curl -X DELETE "https://your-domain.com/api/dashboard/integrations/luma"
```

---

### Credentials (Clerk-only)

#### GET /api/dashboard/credentials

Lists stored API credentials for the tenant.

```bash
curl "https://your-domain.com/api/dashboard/credentials"
```

**Response:**
```json
{
  "credentials": [
    {
      "id": "uuid",
      "provider": "luma",
      "label": "Production Luma Key",
      "accountIdentifier": "acme-org",
      "isActive": true,
      "lastUsedAt": "2026-02-10T08:00:00Z",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

#### POST /api/dashboard/credentials

Saves an API credential (e.g. Luma API key).

```bash
curl -X POST "https://your-domain.com/api/dashboard/credentials" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "luma",
    "apiKey": "luma_key_abc123",
    "label": "Production Luma Key",
    "accountIdentifier": "acme-org"
  }'
```

#### PATCH /api/dashboard/credentials/:provider

Updates a stored credential.

```bash
curl -X PATCH "https://your-domain.com/api/dashboard/credentials/luma" \
  -H "Content-Type: application/json" \
  -d '{ "apiKey": "luma_key_new456", "isActive": true }'
```

#### DELETE /api/dashboard/credentials/:provider

Deletes a stored credential.

```bash
curl -X DELETE "https://your-domain.com/api/dashboard/credentials/luma"
```

---

### Judging Management

#### GET /api/dashboard/hackathons/:id/judging/criteria

Lists all judging criteria for a hackathon. Requires scope: `hackathons:read`

```bash
curl "https://your-domain.com/api/dashboard/hackathons/{id}/judging/criteria" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

**Response:**
```json
{
  "criteria": [
    {
      "id": "uuid",
      "name": "Innovation",
      "description": "How novel is the approach?",
      "maxScore": 10,
      "weight": 1.5,
      "displayOrder": 1,
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

#### POST /api/dashboard/hackathons/:id/judging/criteria

Creates a new judging criteria. Requires scope: `hackathons:write`

```bash
curl -X POST "https://your-domain.com/api/dashboard/hackathons/{id}/judging/criteria" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Innovation",
    "description": "How novel is the approach?",
    "maxScore": 10,
    "weight": 1.5
  }'
```

#### PATCH /api/dashboard/hackathons/:id/judging/criteria/:criteriaId

Updates a judging criteria. Requires scope: `hackathons:write`

```bash
curl -X PATCH "https://your-domain.com/api/dashboard/hackathons/{id}/judging/criteria/{criteriaId}" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{ "weight": 2.0 }'
```

#### DELETE /api/dashboard/hackathons/:id/judging/criteria/:criteriaId

Deletes a judging criteria. Requires scope: `hackathons:write`

```bash
curl -X DELETE "https://your-domain.com/api/dashboard/hackathons/{id}/judging/criteria/{criteriaId}" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

---

#### GET /api/dashboard/hackathons/:id/judging/user-search

Searches Clerk users by name or email for adding as judges. Requires scope: `hackathons:read`

```bash
curl "https://your-domain.com/api/dashboard/hackathons/{id}/judging/user-search?q=jane" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

**Response:**
```json
{
  "users": [
    {
      "id": "user_abc",
      "email": "jane@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "username": "janesmith",
      "imageUrl": "https://img.clerk.com/..."
    }
  ]
}
```

---

#### GET /api/dashboard/hackathons/:id/judging/judges

Lists all judges for a hackathon with assignment progress. Requires scope: `hackathons:read`

```bash
curl "https://your-domain.com/api/dashboard/hackathons/{id}/judging/judges" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

**Response:**
```json
{
  "judges": [
    {
      "participantId": "uuid",
      "clerkUserId": "user_abc",
      "displayName": "Jane Smith",
      "email": "jane@example.com",
      "imageUrl": "https://img.clerk.com/...",
      "assignmentCount": 5,
      "completedCount": 3
    }
  ]
}
```

#### POST /api/dashboard/hackathons/:id/judging/judges

Adds a judge by Clerk user ID or email. If the email user is not found, sends an invitation email. Requires scope: `hackathons:write`

```bash
# By Clerk user ID
curl -X POST "https://your-domain.com/api/dashboard/hackathons/{id}/judging/judges" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{ "clerkUserId": "user_abc" }'

# By email (sends invitation if user not found)
curl -X POST "https://your-domain.com/api/dashboard/hackathons/{id}/judging/judges" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{ "email": "judge@example.com" }'
```

#### DELETE /api/dashboard/hackathons/:id/judging/judges/:participantId

Removes a judge from a hackathon. Requires scope: `hackathons:write`

```bash
curl -X DELETE "https://your-domain.com/api/dashboard/hackathons/{id}/judging/judges/{participantId}" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

**Response:**
```json
{ "success": true, "resultsStale": true }
```

`resultsStale` indicates if previously calculated results need recalculation.

---

#### GET /api/dashboard/hackathons/:id/judging/assignments

Lists all judge-submission assignments with progress stats. Requires scope: `hackathons:read`

```bash
curl "https://your-domain.com/api/dashboard/hackathons/{id}/judging/assignments" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

**Response:**
```json
{
  "assignments": [
    {
      "id": "uuid",
      "judgeParticipantId": "uuid",
      "judgeName": "Jane Smith",
      "submissionId": "uuid",
      "submissionTitle": "AI Code Review Bot",
      "isComplete": false,
      "assignedAt": "2026-02-15T10:00:00Z"
    }
  ],
  "progress": {
    "totalAssignments": 15,
    "completedAssignments": 9,
    "totalSubmissions": 5,
    "fullyJudgedSubmissions": 3
  }
}
```

#### POST /api/dashboard/hackathons/:id/judging/assignments

Manually assigns a judge to a submission. Requires scope: `hackathons:write`

```bash
curl -X POST "https://your-domain.com/api/dashboard/hackathons/{id}/judging/assignments" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{ "judgeParticipantId": "uuid", "submissionId": "uuid" }'
```

#### DELETE /api/dashboard/hackathons/:id/judging/assignments/:assignmentId

Removes a judge-submission assignment. Requires scope: `hackathons:write`

```bash
curl -X DELETE "https://your-domain.com/api/dashboard/hackathons/{id}/judging/assignments/{assignmentId}" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

#### POST /api/dashboard/hackathons/:id/judging/auto-assign

Automatically distributes submissions across judges evenly. Requires scope: `hackathons:write`

```bash
curl -X POST "https://your-domain.com/api/dashboard/hackathons/{id}/judging/auto-assign" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{ "submissionsPerJudge": 3 }'
```

**Response:**
```json
{ "assignedCount": 15 }
```

---

#### GET /api/dashboard/hackathons/:id/judging/invitations

Lists pending judge invitations for a hackathon. Requires scope: `hackathons:read`

```bash
curl "https://your-domain.com/api/dashboard/hackathons/{id}/judging/invitations" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

#### DELETE /api/dashboard/hackathons/:id/judging/invitations/:invitationId

Cancels a pending judge invitation. Requires scope: `hackathons:write`

```bash
curl -X DELETE "https://your-domain.com/api/dashboard/hackathons/{id}/judging/invitations/{invitationId}" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

---

### Prize Management

#### GET /api/dashboard/hackathons/:id/prizes

Lists all prizes and prize-submission assignments for a hackathon. Requires scope: `hackathons:read`

```bash
curl "https://your-domain.com/api/dashboard/hackathons/{id}/prizes" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

**Response:**
```json
{
  "prizes": [
    {
      "id": "uuid",
      "name": "Best Overall",
      "description": "Top project across all criteria",
      "value": "$5,000",
      "displayOrder": 1,
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "assignments": [
    {
      "id": "uuid",
      "prizeId": "uuid",
      "prizeName": "Best Overall",
      "submissionId": "uuid",
      "submissionTitle": "AI Code Review Bot",
      "teamName": "BuilderSquad",
      "assignedAt": "2026-02-16T12:00:00Z"
    }
  ]
}
```

#### POST /api/dashboard/hackathons/:id/prizes

Creates a new prize. Requires scope: `hackathons:write`

```bash
curl -X POST "https://your-domain.com/api/dashboard/hackathons/{id}/prizes" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Best Overall", "description": "Top project", "value": "$5,000" }'
```

#### PATCH /api/dashboard/hackathons/:id/prizes/:prizeId

Updates a prize. Requires scope: `hackathons:write`

```bash
curl -X PATCH "https://your-domain.com/api/dashboard/hackathons/{id}/prizes/{prizeId}" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{ "value": "$10,000" }'
```

#### DELETE /api/dashboard/hackathons/:id/prizes/:prizeId

Deletes a prize. Requires scope: `hackathons:write`

```bash
curl -X DELETE "https://your-domain.com/api/dashboard/hackathons/{id}/prizes/{prizeId}" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

#### POST /api/dashboard/hackathons/:id/prizes/reorder

Reorders prizes by setting display order. Requires scope: `hackathons:write`

```bash
curl -X POST "https://your-domain.com/api/dashboard/hackathons/{id}/prizes/reorder" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{ "orderedIds": ["prize-id-3", "prize-id-1", "prize-id-2"] }'
```

#### POST /api/dashboard/hackathons/:id/prizes/:prizeId/assign

Assigns a prize to a submission. Requires scope: `hackathons:write`

```bash
curl -X POST "https://your-domain.com/api/dashboard/hackathons/{id}/prizes/{prizeId}/assign" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{ "submissionId": "uuid" }'
```

#### DELETE /api/dashboard/hackathons/:id/prizes/:prizeId/assign/:submissionId

Removes a prize assignment from a submission. Requires scope: `hackathons:write`

```bash
curl -X DELETE "https://your-domain.com/api/dashboard/hackathons/{id}/prizes/{prizeId}/assign/{submissionId}" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

---

### Results Management

#### POST /api/dashboard/hackathons/:id/results/calculate

Calculates rankings from judging scores. Requires scope: `hackathons:write`

```bash
curl -X POST "https://your-domain.com/api/dashboard/hackathons/{id}/results/calculate" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

**Response:**
```json
{ "success": true, "count": 5 }
```

#### GET /api/dashboard/hackathons/:id/results

Returns detailed results with scores for organizers. Requires scope: `hackathons:read`

```bash
curl "https://your-domain.com/api/dashboard/hackathons/{id}/results" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

**Response:**
```json
{
  "results": [
    {
      "id": "uuid",
      "rank": 1,
      "submissionId": "uuid",
      "submissionTitle": "AI Code Review Bot",
      "teamName": "BuilderSquad",
      "totalScore": 85,
      "weightedScore": 92.5,
      "judgeCount": 3,
      "publishedAt": null,
      "prizes": ["Best Overall"]
    }
  ],
  "isPublished": false
}
```

#### POST /api/dashboard/hackathons/:id/results/publish

Makes results publicly visible and transitions hackathon to completed. Requires scope: `hackathons:write`

```bash
curl -X POST "https://your-domain.com/api/dashboard/hackathons/{id}/results/publish" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

#### POST /api/dashboard/hackathons/:id/results/unpublish

Hides published results from public view. Requires scope: `hackathons:write`

```bash
curl -X POST "https://your-domain.com/api/dashboard/hackathons/{id}/results/unpublish" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

---

#### GET /api/dashboard/hackathons/:id/announcements

Lists all announcements for a hackathon (including drafts). Requires scope: `hackathons:read`

```bash
curl "https://your-domain.com/api/dashboard/hackathons/{id}/announcements" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

#### POST /api/dashboard/hackathons/:id/announcements

Creates a draft announcement. Requires scope: `hackathons:write`

```bash
curl -X POST "https://your-domain.com/api/dashboard/hackathons/{id}/announcements" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"title": "Submission deadline extended", "body": "You have an extra hour!", "priority": "urgent", "audience": "everyone"}'
```

#### PATCH /api/dashboard/hackathons/:id/announcements/:announcementId

Updates an announcement. Requires scope: `hackathons:write`

```bash
curl -X PATCH "https://your-domain.com/api/dashboard/hackathons/{id}/announcements/{announcementId}" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated title", "audience": "judges"}'
```

#### DELETE /api/dashboard/hackathons/:id/announcements/:announcementId

Deletes an announcement. Requires scope: `hackathons:write`

```bash
curl -X DELETE "https://your-domain.com/api/dashboard/hackathons/{id}/announcements/{announcementId}" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

#### POST /api/dashboard/hackathons/:id/announcements/:announcementId/publish

Publishes an announcement immediately. Requires scope: `hackathons:write`

```bash
curl -X POST "https://your-domain.com/api/dashboard/hackathons/{id}/announcements/{announcementId}/publish" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

#### POST /api/dashboard/hackathons/:id/announcements/:announcementId/schedule

Schedules an announcement for future publishing. Requires scope: `hackathons:write`

```bash
curl -X POST "https://your-domain.com/api/dashboard/hackathons/{id}/announcements/{announcementId}/schedule" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"scheduledAt": "2026-04-28T14:00:00Z"}'
```

#### POST /api/dashboard/hackathons/:id/announcements/:announcementId/unpublish

Reverts a published announcement to draft. Requires scope: `hackathons:write`

```bash
curl -X POST "https://your-domain.com/api/dashboard/hackathons/{id}/announcements/{announcementId}/unpublish" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

#### GET /api/dashboard/hackathons/:id/schedule

Lists all schedule items for a hackathon. Requires scope: `hackathons:read`

```bash
curl "https://your-domain.com/api/dashboard/hackathons/{id}/schedule" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

#### POST /api/dashboard/hackathons/:id/schedule

Creates a schedule item. Requires scope: `hackathons:write`

```bash
curl -X POST "https://your-domain.com/api/dashboard/hackathons/{id}/schedule" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"title": "Opening Ceremony", "startsAt": "2026-04-28T09:00:00Z", "endsAt": "2026-04-28T09:30:00Z", "location": "Main Hall"}'
```

#### PATCH /api/dashboard/hackathons/:id/schedule/:itemId

Updates a schedule item. Requires scope: `hackathons:write`

```bash
curl -X PATCH "https://your-domain.com/api/dashboard/hackathons/{id}/schedule/{itemId}" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated title", "location": "Room B"}'
```

#### DELETE /api/dashboard/hackathons/:id/schedule/:itemId

Deletes a schedule item. Requires scope: `hackathons:write`

```bash
curl -X DELETE "https://your-domain.com/api/dashboard/hackathons/{id}/schedule/{itemId}" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

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
