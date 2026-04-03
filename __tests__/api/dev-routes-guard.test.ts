import { describe, expect, it } from "bun:test"
import { api } from "../../lib/api"

describe("dev routes guard", () => {
  it("does not register dev routes when NODE_ENV is not development", () => {
    const hasDevRoute = api.routes.some((r) => r.path.startsWith("/api/dev"))
    expect(hasDevRoute).toBe(false)
  })
})
