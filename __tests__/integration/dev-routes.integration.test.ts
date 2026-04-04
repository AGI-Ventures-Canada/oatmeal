import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test"

const mockExecuteTransition = mock(() =>
  Promise.resolve({ success: false, error: "invalid_transition" })
)

mock.module("@/lib/services/lifecycle", () => ({
  executeTransition: mockExecuteTransition,
}))

let singleResult: { data: unknown; error: unknown } = { data: null, error: null }
let updateResult: { error: unknown } = { error: null }

function createChain(isUpdate = false) {
  const chain: Record<string, unknown> = {}
  chain.from = () => createChain()
  chain.select = () => chain
  chain.update = () => createChain(true)
  chain.eq = () => chain
  chain.single = () => Promise.resolve(singleResult)
  if (isUpdate) {
    chain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
      Promise.resolve(updateResult).then(resolve, reject)
  }
  return chain
}

mock.module("@/lib/db/client", () => ({
  supabase: () => createChain(),
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
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    Object.assign(process.env, { NODE_ENV: "development" })
    mockExecuteTransition.mockReset()
    mockExecuteTransition.mockResolvedValue({ success: false, error: "invalid_transition" })
    singleResult = { data: null, error: null }
    updateResult = { error: null }
  })

  afterEach(() => {
    Object.assign(process.env, { NODE_ENV: originalNodeEnv })
  })

  it("returns 404 when hackathon not found", async () => {
    singleResult = { data: null, error: null }

    const res = await PATCH("nonexistent-id", "active")
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe("Hackathon not found")
  })

  it("updates status via lifecycle transition", async () => {
    singleResult = {
      data: { id: "hackathon-abc", tenant_id: "tenant-123", status: "draft" },
      error: null,
    }
    mockExecuteTransition.mockResolvedValue({
      success: true,
      hackathon: { id: "hackathon-abc", status: "active" },
    })

    const res = await PATCH("hackathon-abc", "active")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe("hackathon-abc")
    expect(body.status).toBe("active")
  })

  it("falls back to direct write when transition fails", async () => {
    singleResult = {
      data: { id: "hackathon-abc", tenant_id: "tenant-123", status: "draft" },
      error: null,
    }
    mockExecuteTransition.mockResolvedValue({ success: false, error: "invalid_transition" })
    updateResult = { error: null }

    const res = await PATCH("hackathon-abc", "active")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe("hackathon-abc")
    expect(body.status).toBe("active")
  })

  it("returns 500 when direct write also fails", async () => {
    singleResult = {
      data: { id: "hackathon-abc", tenant_id: "tenant-123", status: "draft" },
      error: null,
    }
    mockExecuteTransition.mockResolvedValue({ success: false, error: "invalid_transition" })
    updateResult = { error: { message: "DB error" } }

    const res = await PATCH("hackathon-abc", "active")
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe("Update failed")
  })

  it("returns same status without update when already matching", async () => {
    singleResult = {
      data: { id: "hackathon-abc", tenant_id: "tenant-123", status: "active" },
      error: null,
    }

    const res = await PATCH("hackathon-abc", "active")
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe("hackathon-abc")
    expect(body.status).toBe("active")
    expect(mockExecuteTransition).not.toHaveBeenCalled()
  })

  it("rejects invalid status values", async () => {
    const res = await PATCH("hackathon-abc", "not_a_real_status")
    expect(res.status).toBe(422)
  })
})

describe("dev routes guard", () => {
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    Object.assign(process.env, { NODE_ENV: originalNodeEnv })
  })

  it("returns 403 when NODE_ENV is not development (runtime defence-in-depth)", async () => {
    Object.assign(process.env, { NODE_ENV: "production" })
    const res = await PATCH("hackathon-abc", "active")
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe("Forbidden")
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
