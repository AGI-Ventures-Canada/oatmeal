import { describe, expect, it } from "bun:test"
import { api } from "../../lib/api"

describe("dev routes guard", () => {
  it("registers dev routes in development or when ADMIN_ENABLED", () => {
    const hasDevRoute = api.routes.some((r) => r.path.startsWith("/api/dev"))
    const shouldMount =
      process.env.NODE_ENV === "development" ||
      process.env.ADMIN_ENABLED === "true"

    expect(hasDevRoute).toBe(shouldMount)
  })

  it("does not register dev routes in non-dev without ADMIN_ENABLED", () => {
    if (process.env.NODE_ENV === "development" || process.env.ADMIN_ENABLED === "true") {
      return
    }
    const hasDevRoute = api.routes.some((r) => r.path.startsWith("/api/dev"))
    expect(hasDevRoute).toBe(false)
  })
})
