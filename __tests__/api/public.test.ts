import { describe, expect, it } from "bun:test"
import { Elysia } from "elysia"
import { publicRoutes } from "@/lib/api/routes/public"

const app = new Elysia({ prefix: "/api" }).use(publicRoutes)

describe("Public Routes", () => {
  describe("GET /api/public/health", () => {
    it("returns status ok", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/public/health")
      )
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.status).toBe("ok")
    })

    it("returns a timestamp", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/public/health")
      )
      const data = await res.json()

      expect(data.timestamp).toBeDefined()
      expect(new Date(data.timestamp).getTime()).not.toBeNaN()
    })

    it("returns valid ISO timestamp format", async () => {
      const res = await app.handle(
        new Request("http://localhost/api/public/health")
      )
      const data = await res.json()

      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
      expect(data.timestamp).toMatch(isoRegex)
    })
  })
})
