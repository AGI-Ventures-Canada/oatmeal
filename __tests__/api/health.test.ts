import { describe, expect, it } from "bun:test"
import { api } from "../../lib/api"

describe("GET /api/public/health", () => {
  it("returns status ok", async () => {
    const res = await api.handle(
      new Request("http://localhost/api/public/health")
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.status).toBe("ok")
  })

  it("returns a timestamp", async () => {
    const res = await api.handle(
      new Request("http://localhost/api/public/health")
    )
    const data = await res.json()

    expect(data.timestamp).toBeDefined()
    expect(new Date(data.timestamp).getTime()).not.toBeNaN()
  })

  it("returns valid JSON content-type", async () => {
    const res = await api.handle(
      new Request("http://localhost/api/public/health")
    )

    expect(res.headers.get("content-type")).toContain("application/json")
  })
})
