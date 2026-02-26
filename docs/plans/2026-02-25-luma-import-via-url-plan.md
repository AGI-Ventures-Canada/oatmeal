# Luma Import via URL - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow organizers to import Luma events into Oatmeal by replacing `luma.com` with `oatmeal.com` in their browser URL bar.

**Architecture:** A public catch-all route at `app/(public)/luma.com/[...path]/` fetches the Luma event page, extracts JSON-LD structured data, and renders a prefilled hackathon creation form. A secondary `lu.ma` route redirects to the primary. A public API endpoint handles extraction, and hackathon creation reuses existing endpoints with an extended input type.

**Tech Stack:** Next.js 16 App Router, Elysia API routes, Supabase Storage (banner upload), sharp (image optimization), Clerk auth (guest mode with localStorage persistence)

**Design Doc:** `docs/plans/2026-02-25-luma-import-via-url-design.md`

---

## Task 1: Luma Page Extraction Service

The core service that fetches a public Luma page and extracts structured event data from JSON-LD.

**Files:**
- Create: `lib/services/luma-import.ts`
- Test: `__tests__/services/luma-import.test.ts`

**Step 1: Write the failing test for `extractLumaEventData`**

```typescript
// __tests__/services/luma-import.test.ts
import { describe, it, expect, beforeEach, mock } from "bun:test"

const mockFetch = mock(() => Promise.resolve(new Response("")))
globalThis.fetch = mockFetch as unknown as typeof fetch

const { extractLumaEventData } = await import("@/lib/services/luma-import")

const MOCK_HTML_WITH_JSONLD = `
<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Test Hackathon",
  "description": "A test event description",
  "startDate": "2026-03-15T09:00:00.000-08:00",
  "endDate": "2026-03-16T17:00:00.000-08:00",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "image": ["https://images.lumacdn.com/test-image.png"],
  "location": {
    "@type": "Place",
    "name": "San Francisco, California",
    "geo": { "@type": "GeoCoordinates", "latitude": 37.79, "longitude": -122.4 }
  }
}
</script>
</head><body></body></html>
`

describe("extractLumaEventData", () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it("extracts event data from JSON-LD", async () => {
    mockFetch.mockResolvedValueOnce(new Response(MOCK_HTML_WITH_JSONLD, { status: 200 }))

    const result = await extractLumaEventData("sfagents")
    expect(result).not.toBeNull()
    expect(result!.name).toBe("Test Hackathon")
    expect(result!.description).toBe("A test event description")
    expect(result!.startsAt).toBe("2026-03-15T09:00:00.000-08:00")
    expect(result!.endsAt).toBe("2026-03-16T17:00:00.000-08:00")
    expect(result!.locationType).toBe("in_person")
    expect(result!.locationName).toBe("San Francisco, California")
    expect(result!.imageUrl).toBe("https://images.lumacdn.com/test-image.png")
  })

  it("fetches from https://luma.com/{slug}", async () => {
    mockFetch.mockResolvedValueOnce(new Response(MOCK_HTML_WITH_JSONLD, { status: 200 }))

    await extractLumaEventData("my-hackathon")
    expect(mockFetch).toHaveBeenCalledWith("https://luma.com/my-hackathon")
  })

  it("returns null when fetch fails", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Not Found", { status: 404 }))

    const result = await extractLumaEventData("nonexistent")
    expect(result).toBeNull()
  })

  it("returns null when no JSON-LD found", async () => {
    mockFetch.mockResolvedValueOnce(new Response("<html><body>No data</body></html>", { status: 200 }))

    const result = await extractLumaEventData("empty-page")
    expect(result).toBeNull()
  })

  it("maps OnlineEventAttendanceMode to virtual", async () => {
    const virtualHtml = MOCK_HTML_WITH_JSONLD.replace(
      "OfflineEventAttendanceMode",
      "OnlineEventAttendanceMode"
    )
    mockFetch.mockResolvedValueOnce(new Response(virtualHtml, { status: 200 }))

    const result = await extractLumaEventData("virtual-event")
    expect(result!.locationType).toBe("virtual")
  })

  it("handles missing optional fields gracefully", async () => {
    const minimalHtml = `
<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Minimal Hackathon"
}
</script>
</head><body></body></html>`
    mockFetch.mockResolvedValueOnce(new Response(minimalHtml, { status: 200 }))

    const result = await extractLumaEventData("minimal")
    expect(result).not.toBeNull()
    expect(result!.name).toBe("Minimal Hackathon")
    expect(result!.description).toBeNull()
    expect(result!.startsAt).toBeNull()
    expect(result!.imageUrl).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test __tests__/services/luma-import.test.ts`
Expected: FAIL — module `@/lib/services/luma-import` does not exist

**Step 3: Write minimal implementation**

```typescript
// lib/services/luma-import.ts

export type LumaEventData = {
  name: string
  description: string | null
  startsAt: string | null
  endsAt: string | null
  locationType: "in_person" | "virtual" | null
  locationName: string | null
  locationUrl: string | null
  imageUrl: string | null
}

const ATTENDANCE_MODE_MAP: Record<string, "in_person" | "virtual"> = {
  "https://schema.org/OfflineEventAttendanceMode": "in_person",
  "https://schema.org/OnlineEventAttendanceMode": "virtual",
  "https://schema.org/MixedEventAttendanceMode": "in_person",
}

export async function extractLumaEventData(
  slug: string
): Promise<LumaEventData | null> {
  const url = `https://luma.com/${slug}`

  let response: Response
  try {
    response = await fetch(url)
  } catch {
    return null
  }

  if (!response.ok) return null

  const html = await response.text()
  return parseJsonLd(html)
}

function parseJsonLd(html: string): LumaEventData | null {
  const jsonLdMatch = html.match(
    /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/
  )
  if (!jsonLdMatch) return null

  let data: Record<string, unknown>
  try {
    data = JSON.parse(jsonLdMatch[1])
  } catch {
    return null
  }

  if (data["@type"] !== "Event") return null

  const name = data.name as string | undefined
  if (!name) return null

  const location = data.location as Record<string, unknown> | undefined
  const images = data.image as string[] | undefined
  const attendanceMode = data.eventAttendanceMode as string | undefined

  return {
    name,
    description: (data.description as string) ?? null,
    startsAt: (data.startDate as string) ?? null,
    endsAt: (data.endDate as string) ?? null,
    locationType: attendanceMode ? (ATTENDANCE_MODE_MAP[attendanceMode] ?? null) : null,
    locationName: (location?.name as string) ?? null,
    locationUrl: (location?.url as string) ?? null,
    imageUrl: images?.[0] ?? null,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun test __tests__/services/luma-import.test.ts`
Expected: All 6 tests PASS

**Step 5: Commit**

```bash
git add lib/services/luma-import.ts __tests__/services/luma-import.test.ts
git commit -m "feat: add Luma event data extraction service"
```

---

## Task 2: Banner Image Download Utility

Add a function that downloads an image from a URL and uploads it to Supabase Storage using the existing `optimizeBanner` + upload pattern from `lib/services/storage.ts`.

**Files:**
- Modify: `lib/services/storage.ts` (add `downloadAndUploadBanner`)
- Test: `__tests__/services/luma-import.test.ts` (add banner download tests)

**Step 1: Write the failing test for `downloadAndUploadBanner`**

Add to the existing test file:

```typescript
// Add to __tests__/services/luma-import.test.ts
import {
  resetSupabaseMocks,
} from "../lib/supabase-mock"

// Mock sharp module
const mockSharpToBuffer = mock(() => Promise.resolve(Buffer.from("optimized")))
const mockSharpWebp = mock(() => ({ toBuffer: mockSharpToBuffer }))
const mockSharpClone = mock(() => ({ webp: mockSharpWebp }))
const mockSharpResize = mock(() => ({ clone: mockSharpClone }))
const mockSharpMetadata = mock(() => Promise.resolve({ width: 800, height: 600 }))

mock.module("sharp", () => ({
  default: () => ({
    metadata: mockSharpMetadata,
    resize: mockSharpResize,
    clone: mockSharpClone,
    webp: mockSharpWebp,
  }),
}))

const { downloadAndUploadBanner } = await import("@/lib/services/storage")

describe("downloadAndUploadBanner", () => {
  beforeEach(() => {
    mockFetch.mockClear()
    resetSupabaseMocks()
  })

  it("downloads image and returns upload result", async () => {
    const imageBuffer = Buffer.from("fake-image-data")
    mockFetch.mockResolvedValueOnce(
      new Response(imageBuffer, {
        status: 200,
        headers: { "content-type": "image/png" },
      })
    )

    const result = await downloadAndUploadBanner("hackathon-123", "https://images.lumacdn.com/test.png")
    expect(mockFetch).toHaveBeenCalledWith("https://images.lumacdn.com/test.png")
    expect(result).not.toBeNull()
  })

  it("returns null when image download fails", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Not Found", { status: 404 }))

    const result = await downloadAndUploadBanner("hackathon-123", "https://bad-url.com/nope.png")
    expect(result).toBeNull()
  })

  it("returns null when imageUrl is null", async () => {
    const result = await downloadAndUploadBanner("hackathon-123", null)
    expect(result).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test __tests__/services/luma-import.test.ts`
Expected: FAIL — `downloadAndUploadBanner` is not exported from `@/lib/services/storage`

**Step 3: Write minimal implementation**

Add to `lib/services/storage.ts`:

```typescript
export async function downloadAndUploadBanner(
  hackathonId: string,
  imageUrl: string | null
): Promise<UploadBannerResult | null> {
  if (!imageUrl) return null

  let response: Response
  try {
    response = await fetch(imageUrl)
  } catch {
    return null
  }

  if (!response.ok) return null

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  try {
    return await uploadBanner(hackathonId, buffer)
  } catch {
    return null
  }
}
```

**Step 4: Run test to verify it passes**

Run: `bun test __tests__/services/luma-import.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/services/storage.ts __tests__/services/luma-import.test.ts
git commit -m "feat: add downloadAndUploadBanner for importing images from URLs"
```

---

## Task 3: Public Import API Endpoint

A public Elysia route that accepts a Luma slug, calls the extraction service, and returns structured data. This endpoint is unauthenticated — anyone can extract Luma event data.

**Files:**
- Create: `lib/api/routes/import.ts`
- Modify: `lib/api/index.ts:48` (register new route)
- Test: `__tests__/api/import.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/api/import.test.ts
import { describe, it, expect, mock, beforeEach } from "bun:test"

const mockExtractLumaEventData = mock(() => Promise.resolve(null))

mock.module("@/lib/services/luma-import", () => ({
  extractLumaEventData: mockExtractLumaEventData,
}))

const { api } = await import("@/lib/api")

describe("POST /api/public/import/luma", () => {
  beforeEach(() => {
    mockExtractLumaEventData.mockClear()
  })

  it("returns extracted event data for valid slug", async () => {
    mockExtractLumaEventData.mockResolvedValueOnce({
      name: "Test Hackathon",
      description: "A test event",
      startsAt: "2026-03-15T09:00:00.000-08:00",
      endsAt: "2026-03-16T17:00:00.000-08:00",
      locationType: "in_person",
      locationName: "San Francisco",
      locationUrl: null,
      imageUrl: "https://images.lumacdn.com/test.png",
    })

    const res = await api.handle(
      new Request("http://localhost/api/public/import/luma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "sfagents" }),
      })
    )

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.name).toBe("Test Hackathon")
    expect(data.imageUrl).toBe("https://images.lumacdn.com/test.png")
  })

  it("returns 404 when event not found", async () => {
    mockExtractLumaEventData.mockResolvedValueOnce(null)

    const res = await api.handle(
      new Request("http://localhost/api/public/import/luma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "nonexistent" }),
      })
    )

    expect(res.status).toBe(404)
  })

  it("returns 400 when slug is missing", async () => {
    const res = await api.handle(
      new Request("http://localhost/api/public/import/luma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    )

    expect(res.status).toBe(400)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test __tests__/api/import.test.ts`
Expected: FAIL — route `/api/public/import/luma` returns 404

**Step 3: Write implementation**

Create the route file:

```typescript
// lib/api/routes/import.ts
import { Elysia, t } from "elysia"

export const importRoutes = new Elysia({ prefix: "/public/import" })
  .post(
    "/luma",
    async ({ body }) => {
      const { extractLumaEventData } = await import("@/lib/services/luma-import")
      const data = await extractLumaEventData(body.slug)

      if (!data) {
        return new Response(
          JSON.stringify({ error: "Could not extract event data from Luma" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        )
      }

      return data
    },
    {
      detail: {
        summary: "Extract Luma event data",
        description: "Fetches a public Luma event page and extracts structured data. No authentication required.",
        tags: ["public"],
      },
      body: t.Object({
        slug: t.String({ minLength: 1 }),
      }),
    }
  )
```

Register in `lib/api/index.ts` — add import and `.use(importRoutes)`:

```typescript
import { importRoutes } from "./routes/import"

// Add after existing .use() calls:
.use(importRoutes)
```

**Step 4: Run test to verify it passes**

Run: `bun test __tests__/api/import.test.ts`
Expected: All 3 tests PASS

**Step 5: Commit**

```bash
git add lib/api/routes/import.ts lib/api/index.ts __tests__/api/import.test.ts
git commit -m "feat: add public Luma import API endpoint"
```

---

## Task 4: Extended Hackathon Creation (Import Mode)

Extend the existing hackathon creation to accept additional fields so the import can create a fully populated hackathon in one flow: create with name + description, then immediately update settings.

**Files:**
- Create: `lib/services/luma-import-create.ts`
- Test: `__tests__/services/luma-import-create.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/services/luma-import-create.test.ts
import { describe, it, expect, beforeEach, mock } from "bun:test"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
} from "../lib/supabase-mock"

const mockDownloadAndUploadBanner = mock(() => Promise.resolve(null))
mock.module("@/lib/services/storage", () => ({
  downloadAndUploadBanner: mockDownloadAndUploadBanner,
  uploadBanner: mock(() => Promise.resolve(null)),
  optimizeBanner: mock(() => Promise.resolve({ buffer: Buffer.from(""), mimeType: "image/webp" })),
}))

const { createHackathonFromImport } = await import("@/lib/services/luma-import-create")

describe("createHackathonFromImport", () => {
  beforeEach(() => {
    resetSupabaseMocks()
    mockDownloadAndUploadBanner.mockClear()
  })

  it("creates hackathon with all imported fields", async () => {
    const insertChain = createChainableMock({
      data: { id: "h1", name: "Test Hackathon", slug: "test-hackathon", tenant_id: "t1" },
      error: null,
    })
    const selectChain = createChainableMock({ data: null, error: null })
    const updateChain = createChainableMock({
      data: { id: "h1", updated_at: "2026-02-25" },
      error: null,
    })

    let callCount = 0
    setMockFromImplementation(() => {
      callCount++
      if (callCount === 1) return selectChain
      if (callCount === 2) return insertChain
      return updateChain
    })

    mockDownloadAndUploadBanner.mockResolvedValueOnce({
      url: "https://storage.supabase.com/banners/h1/banner.webp",
      path: "h1/banner.webp",
    })

    const result = await createHackathonFromImport("tenant-1", {
      name: "Test Hackathon",
      description: "A test event",
      startsAt: "2026-03-15T09:00:00.000-08:00",
      endsAt: "2026-03-16T17:00:00.000-08:00",
      locationType: "in_person",
      locationName: "San Francisco",
      locationUrl: null,
      imageUrl: "https://images.lumacdn.com/test.png",
    })

    expect(result).not.toBeNull()
    expect(result!.id).toBe("h1")
    expect(mockDownloadAndUploadBanner).toHaveBeenCalledWith("h1", "https://images.lumacdn.com/test.png")
  })

  it("creates hackathon even if banner download fails", async () => {
    const insertChain = createChainableMock({
      data: { id: "h2", name: "No Banner", slug: "no-banner", tenant_id: "t1" },
      error: null,
    })
    const selectChain = createChainableMock({ data: null, error: null })
    const updateChain = createChainableMock({
      data: { id: "h2", updated_at: "2026-02-25" },
      error: null,
    })

    let callCount = 0
    setMockFromImplementation(() => {
      callCount++
      if (callCount === 1) return selectChain
      if (callCount === 2) return insertChain
      return updateChain
    })

    mockDownloadAndUploadBanner.mockResolvedValueOnce(null)

    const result = await createHackathonFromImport("tenant-1", {
      name: "No Banner",
      description: null,
      startsAt: null,
      endsAt: null,
      locationType: null,
      locationName: null,
      locationUrl: null,
      imageUrl: null,
    })

    expect(result).not.toBeNull()
    expect(result!.id).toBe("h2")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test __tests__/services/luma-import-create.test.ts`
Expected: FAIL — module does not exist

**Step 3: Write implementation**

```typescript
// lib/services/luma-import-create.ts
import { createHackathon } from "@/lib/services/hackathons"
import { downloadAndUploadBanner } from "@/lib/services/storage"
import { supabase as getSupabase } from "@/lib/db/client"
import type { Hackathon } from "@/lib/db/hackathon-types"

export type ImportHackathonInput = {
  name: string
  description: string | null
  startsAt: string | null
  endsAt: string | null
  locationType: "in_person" | "virtual" | null
  locationName: string | null
  locationUrl: string | null
  imageUrl: string | null
}

export async function createHackathonFromImport(
  tenantId: string,
  input: ImportHackathonInput
): Promise<Hackathon | null> {
  const hackathon = await createHackathon(tenantId, {
    name: input.name,
    description: input.description,
  })

  if (!hackathon) return null

  const bannerResult = await downloadAndUploadBanner(hackathon.id, input.imageUrl)

  const client = getSupabase()
  const { error } = await client
    .from("hackathons")
    .update({
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      location_type: input.locationType,
      location_name: input.locationName,
      location_url: input.locationUrl,
      banner_url: bannerResult?.url ?? null,
    })
    .eq("id", hackathon.id)

  if (error) {
    console.error("Failed to update imported hackathon settings:", error)
  }

  return { ...hackathon, banner_url: bannerResult?.url ?? null } as Hackathon
}
```

**Step 4: Run test to verify it passes**

Run: `bun test __tests__/services/luma-import-create.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/services/luma-import-create.ts __tests__/services/luma-import-create.test.ts
git commit -m "feat: add createHackathonFromImport service for Luma import"
```

---

## Task 5: Dashboard Import API Endpoint

An authenticated endpoint that creates a hackathon from imported Luma data. This calls `createHackathonFromImport` and returns the created hackathon.

**Files:**
- Modify: `lib/api/routes/import.ts` (add authenticated creation endpoint)
- Test: `__tests__/integration/luma-import.integration.test.ts`

**Step 1: Write the failing integration test**

```typescript
// __tests__/integration/luma-import.integration.test.ts
import { describe, it, expect, mock, beforeEach } from "bun:test"
import { AuthError } from "@/lib/auth/principal"

const mockCreateHackathonFromImport = mock(() => Promise.resolve(null))
mock.module("@/lib/services/luma-import-create", () => ({
  createHackathonFromImport: mockCreateHackathonFromImport,
}))

const mockLogAudit = mock(() => Promise.resolve())
mock.module("@/lib/services/audit", () => ({
  logAudit: mockLogAudit,
}))

const mockTriggerWebhooks = mock(() => Promise.resolve())
mock.module("@/lib/services/webhooks", () => ({
  triggerWebhooks: mockTriggerWebhooks,
}))

const mockResolvePrincipal = mock(() => Promise.resolve({ kind: "anon" }))
mock.module("@/lib/auth/principal", () => ({
  resolvePrincipal: mockResolvePrincipal,
  requirePrincipal: (principal: { kind: string; tenantId?: string }, types: string[], scopes: string[]) => {
    if (!principal || principal.kind === "anon") {
      throw new AuthError("Unauthorized", 401)
    }
    return principal
  },
  AuthError,
}))

const { api } = await import("@/lib/api")

describe("POST /api/dashboard/import/luma", () => {
  beforeEach(() => {
    mockCreateHackathonFromImport.mockClear()
    mockResolvePrincipal.mockClear()
    mockLogAudit.mockClear()
  })

  it("creates hackathon from import when authenticated", async () => {
    mockResolvePrincipal.mockResolvedValueOnce({
      kind: "user",
      tenantId: "tenant-1",
      userId: "user-1",
    })

    mockCreateHackathonFromImport.mockResolvedValueOnce({
      id: "h1",
      name: "Imported Hackathon",
      slug: "imported-hackathon",
    })

    const res = await api.handle(
      new Request("http://localhost/api/dashboard/import/luma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Imported Hackathon",
          description: "From Luma",
          startsAt: "2026-03-15T09:00:00.000-08:00",
          endsAt: "2026-03-16T17:00:00.000-08:00",
          locationType: "in_person",
          locationName: "San Francisco",
          locationUrl: null,
          imageUrl: "https://images.lumacdn.com/test.png",
        }),
      })
    )

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe("h1")
    expect(data.slug).toBe("imported-hackathon")
  })

  it("returns 401 when not authenticated", async () => {
    mockResolvePrincipal.mockResolvedValueOnce({ kind: "anon" })

    const res = await api.handle(
      new Request("http://localhost/api/dashboard/import/luma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test" }),
      })
    )

    expect(res.status).toBe(401)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test __tests__/integration/luma-import.integration.test.ts`
Expected: FAIL — route returns 404

**Step 3: Write implementation**

Add to `lib/api/routes/import.ts` — add a dashboard-prefixed route:

```typescript
// Add to lib/api/routes/import.ts
import { resolvePrincipal, requirePrincipal } from "@/lib/auth/principal"

// Add a second Elysia instance for authenticated import
export const dashboardImportRoutes = new Elysia({ prefix: "/dashboard/import" })
  .resolve(async ({ headers }) => {
    const principal = await resolvePrincipal(headers)
    return { principal }
  })
  .post(
    "/luma",
    async ({ principal, body }) => {
      requirePrincipal(principal, ["user", "api_key"], ["hackathons:write"])

      const { createHackathonFromImport } = await import("@/lib/services/luma-import-create")
      const hackathon = await createHackathonFromImport(principal.tenantId, {
        name: body.name,
        description: body.description ?? null,
        startsAt: body.startsAt ?? null,
        endsAt: body.endsAt ?? null,
        locationType: body.locationType ?? null,
        locationName: body.locationName ?? null,
        locationUrl: body.locationUrl ?? null,
        imageUrl: body.imageUrl ?? null,
      })

      if (!hackathon) {
        return new Response(
          JSON.stringify({ error: "Failed to create hackathon" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        )
      }

      const { logAudit } = await import("@/lib/services/audit")
      await logAudit({
        principal,
        action: "hackathon.created",
        resourceType: "hackathon",
        resourceId: hackathon.id,
        metadata: { source: "luma_import" },
      })

      const { triggerWebhooks } = await import("@/lib/services/webhooks")
      triggerWebhooks(principal.tenantId, "hackathon.created", {
        event: "hackathon.created",
        timestamp: new Date().toISOString(),
        data: { hackathonId: hackathon.id, source: "luma_import" },
      }).catch(console.error)

      return {
        id: hackathon.id,
        name: hackathon.name,
        slug: hackathon.slug,
      }
    },
    {
      detail: {
        summary: "Create hackathon from Luma import",
        description: "Creates a new hackathon with prefilled data from a Luma event. Requires hackathons:write scope.",
        tags: ["dashboard"],
      },
      body: t.Object({
        name: t.String({ minLength: 1 }),
        description: t.Optional(t.Union([t.String(), t.Null()])),
        startsAt: t.Optional(t.Union([t.String(), t.Null()])),
        endsAt: t.Optional(t.Union([t.String(), t.Null()])),
        locationType: t.Optional(t.Union([t.Literal("in_person"), t.Literal("virtual"), t.Null()])),
        locationName: t.Optional(t.Union([t.String(), t.Null()])),
        locationUrl: t.Optional(t.Union([t.String(), t.Null()])),
        imageUrl: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  )
```

Register in `lib/api/index.ts`:

```typescript
import { importRoutes, dashboardImportRoutes } from "./routes/import"

// Add .use(dashboardImportRoutes) alongside existing routes
```

**Step 4: Run test to verify it passes**

Run: `bun test __tests__/integration/luma-import.integration.test.ts`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add lib/api/routes/import.ts lib/api/index.ts __tests__/integration/luma-import.integration.test.ts
git commit -m "feat: add authenticated Luma import creation endpoint"
```

---

## Task 6: Import Form Client Component

The prefilled hackathon creation form that displays extracted Luma data and handles both authenticated and guest creation flows.

**Files:**
- Create: `components/hackathon/luma-import-form.tsx`
- Test: `__tests__/components/hackathon/luma-import-form.test.tsx`

**Step 1: Write the failing test**

```typescript
// __tests__/components/hackathon/luma-import-form.test.tsx
import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test"
import { render, screen, cleanup } from "@testing-library/react"

const mockPush = mock(() => {})
const mockRefresh = mock(() => {})

mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    replace: mock(() => {}),
    prefetch: mock(() => {}),
  }),
  usePathname: () => "/luma.com/sfagents",
}))

mock.module("@clerk/nextjs", () => ({
  useAuth: () => ({ isSignedIn: true, orgId: "org-1" }),
  useOrganization: () => ({ organization: { id: "org-1" } }),
}))

const { LumaImportForm } = await import("@/components/hackathon/luma-import-form")

afterEach(() => {
  cleanup()
})

const mockEventData = {
  name: "Test Hackathon",
  description: "A test event description",
  startsAt: "2026-03-15T09:00:00.000-08:00",
  endsAt: "2026-03-16T17:00:00.000-08:00",
  locationType: "in_person" as const,
  locationName: "San Francisco, California",
  locationUrl: null,
  imageUrl: "https://images.lumacdn.com/test.png",
}

describe("LumaImportForm", () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it("renders prefilled form with event data", () => {
    render(<LumaImportForm eventData={mockEventData} lumaSlug="sfagents" />)
    expect(screen.getByDisplayValue("Test Hackathon")).toBeDefined()
    expect(screen.getByText("Create Hackathon")).toBeDefined()
  })

  it("shows the Luma source attribution", () => {
    render(<LumaImportForm eventData={mockEventData} lumaSlug="sfagents" />)
    expect(screen.getByText(/Imported from/)).toBeDefined()
    expect(screen.getByText(/luma.com\/sfagents/)).toBeDefined()
  })

  it("renders event image preview when imageUrl provided", () => {
    render(<LumaImportForm eventData={mockEventData} lumaSlug="sfagents" />)
    const img = screen.getByRole("img")
    expect(img).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test __tests__/components/hackathon/luma-import-form.test.tsx`
Expected: FAIL — module does not exist

**Step 3: Write implementation**

Reference existing patterns from `components/hackathon/create-hackathon-drawer.tsx`. The form component should:
- Display all extracted fields in editable inputs
- Show the banner image preview (using Luma CDN URL for preview)
- Handle Cmd/Ctrl+Enter submission
- Handle guest mode localStorage persistence
- Call `POST /api/dashboard/import/luma` on submit
- Redirect to `/e/{slug}/manage` on success

```typescript
// components/hackathon/luma-import-form.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import type { LumaEventData } from "@/lib/services/luma-import"

const STORAGE_KEY = "oatmeal:luma-import"
const STORAGE_EXPIRY_MS = 24 * 60 * 60 * 1000

type LumaImportFormProps = {
  eventData: LumaEventData
  lumaSlug: string
}

export function LumaImportForm({ eventData, lumaSlug }: LumaImportFormProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isSignedIn } = useAuth()
  const { organization } = useOrganization()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: eventData.name,
    description: eventData.description ?? "",
    startsAt: eventData.startsAt ?? "",
    endsAt: eventData.endsAt ?? "",
    locationType: eventData.locationType ?? "",
    locationName: eventData.locationName ?? "",
    locationUrl: eventData.locationUrl ?? "",
    imageUrl: eventData.imageUrl ?? "",
  })

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Date.now() - parsed.savedAt < STORAGE_EXPIRY_MS) {
          setFormData(parsed)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !isSubmitting) {
      e.preventDefault()
      handleSubmit()
    }
  }

  async function handleSubmit() {
    if (!formData.name.trim()) {
      setError("Hackathon name is required")
      return
    }

    if (!isSignedIn || !organization) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...formData, savedAt: Date.now() }))
      router.push(`/sign-in?redirect_url=${pathname}`)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/dashboard/import/luma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          startsAt: formData.startsAt || null,
          endsAt: formData.endsAt || null,
          locationType: formData.locationType || null,
          locationName: formData.locationName || null,
          locationUrl: formData.locationUrl || null,
          imageUrl: formData.imageUrl || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create hackathon")
        return
      }

      const { slug } = await res.json()
      localStorage.removeItem(STORAGE_KEY)
      router.push(`/e/${slug}/manage`)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6" onKeyDown={handleKeyDown}>
      <Card>
        <CardHeader>
          <CardTitle>Import from Luma</CardTitle>
          <CardDescription>
            Imported from <span className="font-mono text-xs">luma.com/{lumaSlug}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.imageUrl && (
            <img
              src={formData.imageUrl}
              alt={formData.name}
              className="aspect-video w-full rounded-md object-cover"
            />
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Hackathon Name</Label>
            <Input
              id="name"
              name="hackathon-name"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={4}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startsAt">Start Date</Label>
              <Input
                id="startsAt"
                type="datetime-local"
                value={formData.startsAt ? formData.startsAt.slice(0, 16) : ""}
                onChange={(e) => updateField("startsAt", e.target.value ? new Date(e.target.value).toISOString() : "")}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsAt">End Date</Label>
              <Input
                id="endsAt"
                type="datetime-local"
                value={formData.endsAt ? formData.endsAt.slice(0, 16) : ""}
                onChange={(e) => updateField("endsAt", e.target.value ? new Date(e.target.value).toISOString() : "")}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationName">Location</Label>
            <Input
              id="locationName"
              value={formData.locationName}
              onChange={(e) => updateField("locationName", e.target.value)}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Hackathon"
            )}
          </Button>

          {!isSignedIn && (
            <p className="text-center text-sm text-muted-foreground">
              You'll be asked to sign in before creating
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `bun test __tests__/components/hackathon/luma-import-form.test.tsx`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add components/hackathon/luma-import-form.tsx __tests__/components/hackathon/luma-import-form.test.tsx
git commit -m "feat: add LumaImportForm client component"
```

---

## Task 7: Next.js Route Pages

Create the two catch-all route pages and their layouts.

**Files:**
- Create: `app/(public)/luma.com/[...path]/page.tsx`
- Create: `app/(public)/lu.ma/[...path]/page.tsx`

**Step 1: Write the `lu.ma` redirect page**

This page simply redirects to the `luma.com` equivalent.

```typescript
// app/(public)/lu.ma/[...path]/page.tsx
import { redirect } from "next/navigation"

type PageProps = {
  params: Promise<{ path: string[] }>
}

export default async function LumaShortUrlPage({ params }: PageProps) {
  const { path } = await params
  redirect(`/luma.com/${path.join("/")}`)
}
```

**Step 2: Write the primary `luma.com` import page**

This server page fetches event data and renders the client form.

```typescript
// app/(public)/luma.com/[...path]/page.tsx
import { notFound } from "next/navigation"
import { extractLumaEventData } from "@/lib/services/luma-import"
import { LumaImportForm } from "@/components/hackathon/luma-import-form"
import type { Metadata } from "next"

type PageProps = {
  params: Promise<{ path: string[] }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { path } = await params
  const slug = path.join("/")
  const eventData = await extractLumaEventData(slug)

  if (!eventData) {
    return { title: "Import from Luma | Oatmeal" }
  }

  return {
    title: `Import "${eventData.name}" from Luma | Oatmeal`,
    description: `Create a hackathon from the Luma event: ${eventData.name}`,
  }
}

export default async function LumaImportPage({ params }: PageProps) {
  const { path } = await params
  const slug = path.join("/")
  const eventData = await extractLumaEventData(slug)

  if (!eventData) {
    notFound()
  }

  return <LumaImportForm eventData={eventData} lumaSlug={slug} />
}
```

**Step 3: Verify manually**

Run: `bun dev`
Visit: `http://localhost:3000/luma.com/sfagents`
Expected: See prefilled form with "Autonomous Agents Hackathon" data

Visit: `http://localhost:3000/lu.ma/sfagents`
Expected: Redirects to `/luma.com/sfagents`

**Step 4: Commit**

```bash
git add "app/(public)/luma.com/[...path]/page.tsx" "app/(public)/lu.ma/[...path]/page.tsx"
git commit -m "feat: add Luma import route pages with catch-all URL pattern"
```

---

## Task 8: Dashboard "Paste a Luma Link" Input

Add a paste input on the dashboard so users who don't know the URL trick can still import.

**Files:**
- Modify: `app/(dashboard)/home/hackathon-tabs.tsx` (add paste input)
- Test: `__tests__/components/hackathon/luma-paste-input.test.tsx`

**Step 1: Write the failing test**

```typescript
// __tests__/components/hackathon/luma-paste-input.test.tsx
import { describe, it, expect, mock, afterEach } from "bun:test"
import { render, screen, cleanup, fireEvent } from "@testing-library/react"

const mockPush = mock(() => {})
mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mock(() => {}), replace: mock(() => {}), prefetch: mock(() => {}) }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/home",
}))

const { LumaPasteInput } = await import("@/components/hackathon/luma-paste-input")

afterEach(() => {
  cleanup()
  mockPush.mockClear()
})

describe("LumaPasteInput", () => {
  it("renders the paste input", () => {
    render(<LumaPasteInput />)
    expect(screen.getByPlaceholderText(/Paste a Luma link/)).toBeDefined()
  })

  it("navigates to import page on valid luma.com URL", () => {
    render(<LumaPasteInput />)
    const input = screen.getByPlaceholderText(/Paste a Luma link/)
    fireEvent.change(input, { target: { value: "https://luma.com/sfagents" } })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(mockPush).toHaveBeenCalledWith("/luma.com/sfagents")
  })

  it("navigates to import page on valid lu.ma URL", () => {
    render(<LumaPasteInput />)
    const input = screen.getByPlaceholderText(/Paste a Luma link/)
    fireEvent.change(input, { target: { value: "https://lu.ma/my-event" } })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(mockPush).toHaveBeenCalledWith("/luma.com/my-event")
  })

  it("shows error for invalid URLs", () => {
    render(<LumaPasteInput />)
    const input = screen.getByPlaceholderText(/Paste a Luma link/)
    fireEvent.change(input, { target: { value: "https://google.com" } })
    fireEvent.keyDown(input, { key: "Enter" })

    expect(mockPush).not.toHaveBeenCalled()
    expect(screen.getByText(/Please enter a valid Luma URL/)).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test __tests__/components/hackathon/luma-paste-input.test.tsx`
Expected: FAIL — module does not exist

**Step 3: Write implementation**

```typescript
// components/hackathon/luma-paste-input.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"

function parseLumaUrl(input: string): string | null {
  try {
    const url = new URL(input.startsWith("http") ? input : `https://${input}`)
    if (url.hostname === "luma.com" || url.hostname === "www.luma.com") {
      return url.pathname.replace(/^\//, "")
    }
    if (url.hostname === "lu.ma" || url.hostname === "www.lu.ma") {
      return url.pathname.replace(/^\//, "")
    }
    return null
  } catch {
    return null
  }
}

export function LumaPasteInput() {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return

    const slug = parseLumaUrl(value)
    if (!slug) {
      setError("Please enter a valid Luma URL (e.g. luma.com/my-event)")
      return
    }

    setError(null)
    router.push(`/luma.com/${slug}`)
  }

  return (
    <div className="w-full sm:w-64">
      <Input
        placeholder="Paste a Luma link to import"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setError(null)
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}
```

Then add to `hackathon-tabs.tsx` — import and place the `<LumaPasteInput />` component near the search bar in the "Organizing" tab area. The exact placement depends on the current layout, but it should be alongside existing action buttons.

**Step 4: Run test to verify it passes**

Run: `bun test __tests__/components/hackathon/luma-paste-input.test.tsx`
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add components/hackathon/luma-paste-input.tsx __tests__/components/hackathon/luma-paste-input.test.tsx app/\(dashboard\)/home/hackathon-tabs.tsx
git commit -m "feat: add Luma paste input on dashboard for link imports"
```

---

## Task 9: Run Full Test Suite

Verify everything works together before finishing.

**Step 1: Run unit tests**

Run: `bun test`
Expected: All tests PASS with 90%+ coverage

**Step 2: Run integration tests**

Run: `bun test:integration`
Expected: All tests PASS

**Step 3: Run lint**

Run: `bun lint`
Expected: No errors

**Step 4: Run build**

Run: `bun run build`
Expected: Build succeeds

**Step 5: Manual QA**

Run: `bun dev`
Test these flows:
1. Visit `localhost:3000/luma.com/sfagents` — see prefilled form
2. Visit `localhost:3000/lu.ma/sfagents` — redirects to luma.com version
3. Click "Create Hackathon" while logged out — saves to localStorage, redirects to sign-in
4. After sign-in, return to import page — form restored from localStorage
5. Click "Create Hackathon" while logged in — creates hackathon, redirects to manage page
6. On dashboard, paste `https://luma.com/sfagents` into the Luma input — navigates to import page

**Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: address test suite and build issues"
```

---

## Summary

| Task | What It Builds | Files |
|------|---------------|-------|
| 1 | Luma page extraction service | `lib/services/luma-import.ts` |
| 2 | Banner image download utility | `lib/services/storage.ts` (extend) |
| 3 | Public extraction API endpoint | `lib/api/routes/import.ts` |
| 4 | Import creation service | `lib/services/luma-import-create.ts` |
| 5 | Authenticated creation API endpoint | `lib/api/routes/import.ts` (extend) |
| 6 | Import form client component | `components/hackathon/luma-import-form.tsx` |
| 7 | Next.js route pages | `app/(public)/luma.com/`, `app/(public)/lu.ma/` |
| 8 | Dashboard paste input | `components/hackathon/luma-paste-input.tsx` |
| 9 | Full test suite verification | N/A |
