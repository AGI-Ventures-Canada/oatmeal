import { describe, expect, it, afterEach } from "bun:test"
import { Elysia } from "elysia"

describe("dev routes guard", () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalAdminEnabled = process.env.ADMIN_ENABLED

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    if (originalAdminEnabled === undefined) {
      delete process.env.ADMIN_ENABLED
    } else {
      process.env.ADMIN_ENABLED = originalAdminEnabled
    }
  })

  it("returns 403 for unauthenticated requests in non-dev environment", async () => {
    process.env.NODE_ENV = "production"
    process.env.ADMIN_ENABLED = "true"

    const { devRoutes } = await import("@/lib/api/routes/dev")
    const app = new Elysia({ prefix: "/api" }).use(devRoutes)

    const res = await app.handle(
      new Request("http://localhost/api/dev/config-status")
    )

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe("Forbidden")
  })

  it("allows requests in development environment", async () => {
    process.env.NODE_ENV = "development"

    const { devRoutes } = await import("@/lib/api/routes/dev")
    const app = new Elysia({ prefix: "/api" }).use(devRoutes)

    const res = await app.handle(
      new Request("http://localhost/api/dev/config-status")
    )

    expect(res.status).toBe(200)
  })
})
