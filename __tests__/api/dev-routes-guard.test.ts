import { describe, expect, it } from "bun:test"
import { api } from "../../lib/api"

describe("dev routes guard", () => {
  it("registers dev routes based on environment", () => {
    const hasDevRoute = api.routes.some((r) => r.path.startsWith("/api/dev"))
    const shouldMount =
      process.env.NODE_ENV === "development" ||
      process.env.ADMIN_ENABLED === "true"

    expect(hasDevRoute).toBe(shouldMount)
  })
})
