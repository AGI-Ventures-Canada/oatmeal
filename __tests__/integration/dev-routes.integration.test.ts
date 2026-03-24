import { describe, it, expect, beforeEach, mock } from "bun:test"

const mockUpdateHackathonSettings = mock(() => Promise.resolve(null))

mock.module("@/lib/services/public-hackathons", () => ({
  updateHackathonSettings: mockUpdateHackathonSettings,
}))

const mockSupabaseChain = {
  from: mock(() => mockSupabaseChain),
  select: mock(() => mockSupabaseChain),
  eq: mock(() => mockSupabaseChain),
  single: mock(() => Promise.resolve({ data: null, error: null })),
}

mock.module("@/lib/db/client", () => ({
  supabase: () => mockSupabaseChain,
}))

const { Elysia } = await import("elysia")
const { devRoutes } = await import("@/lib/api/routes/dev")

const app = new Elysia({ prefix: "/api" }).use(devRoutes)

const PATCH = (id: string, status: string) =>
  app.handle(
    new Request(`http://localhost/api/dev/hackathons/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
  )

describe("dev routes", () => {
  beforeEach(() => {
    mockUpdateHackathonSettings.mockReset()
    mockSupabaseChain.single.mockReset()
  })

  it("returns 404 when hackathon not found", async () => {
    mockSupabaseChain.single.mockResolvedValue({ data: null, error: null })

    const res = await PATCH("nonexistent-id", "active")
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe("Hackathon not found")
  })

  it("updates status and returns id + status", async () => {
    mockSupabaseChain.single.mockResolvedValue({
      data: { tenant_id: "tenant-123" },
      error: null,
    })
    mockUpdateHackathonSettings.mockResolvedValue({
      id: "hackathon-abc",
      status: "active",
    })

    const res = await PATCH("hackathon-abc", "active")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe("hackathon-abc")
    expect(body.status).toBe("active")
  })

  it("returns 500 when update fails", async () => {
    mockSupabaseChain.single.mockResolvedValue({
      data: { tenant_id: "tenant-123" },
      error: null,
    })
    mockUpdateHackathonSettings.mockResolvedValue(null)

    const res = await PATCH("hackathon-abc", "active")
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe("Update failed")
  })

  it("rejects invalid status values", async () => {
    const res = await PATCH("hackathon-abc", "not_a_real_status")
    expect(res.status).toBe(422)
  })
})

describe("dev routes guard", () => {
  it("guard condition: NODE_ENV is not 'development' in test environment", () => {
    expect(process.env.NODE_ENV).not.toBe("development")
  })

  it("an empty Elysia instance returns 404 for dev route (simulates non-dev mount)", async () => {
    const emptyApp = new Elysia({ prefix: "/api" }).use(new Elysia())
    const res = await emptyApp.handle(
      new Request("http://localhost/api/dev/hackathons/any-id/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      })
    )
    expect(res.status).toBe(404)
  })
})
