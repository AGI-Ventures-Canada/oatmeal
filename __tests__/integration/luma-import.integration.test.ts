import { describe, it, expect, mock, beforeEach } from "bun:test"

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

const mockAuth = mock(() => Promise.resolve({ userId: null, orgId: null, orgRole: null }))
mock.module("@clerk/nextjs/server", () => ({
  auth: mockAuth,
  clerkClient: mock(() => Promise.resolve({
    organizations: {
      getOrganization: mock(() => Promise.resolve({ name: "Test Org" })),
    },
  })),
}))

const mockVerifyApiKey = mock(() => Promise.resolve(null))
mock.module("@/lib/services/api-keys", () => ({
  verifyApiKey: mockVerifyApiKey,
  createApiKey: mock(() => Promise.resolve(null)),
  listApiKeys: mock(() => Promise.resolve([])),
  revokeApiKey: mock(() => Promise.resolve(false)),
  getApiKeyById: mock(() => Promise.resolve(null)),
}))

const mockGetOrCreateTenant = mock(() => Promise.resolve(null))
const mockGetOrCreatePersonalTenant = mock(() => Promise.resolve(null))
mock.module("@/lib/services/tenants", () => ({
  getOrCreateTenant: mockGetOrCreateTenant,
  getOrCreatePersonalTenant: mockGetOrCreatePersonalTenant,
}))

const { api } = await import("@/lib/api")

describe("POST /api/dashboard/import/luma", () => {
  beforeEach(() => {
    mockCreateHackathonFromImport.mockClear()
    mockLogAudit.mockClear()
    mockTriggerWebhooks.mockClear()
    mockAuth.mockClear()
    mockVerifyApiKey.mockClear()
    mockGetOrCreateTenant.mockClear()
    mockGetOrCreatePersonalTenant.mockClear()
  })

  it("creates hackathon from import when authenticated", async () => {
    mockAuth.mockResolvedValueOnce({
      userId: "user-1",
      orgId: "org-1",
      orgRole: "org:admin",
    })

    mockGetOrCreateTenant.mockResolvedValueOnce({ id: "tenant-1" })

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
    mockAuth.mockResolvedValueOnce({ userId: null, orgId: null, orgRole: null })

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
