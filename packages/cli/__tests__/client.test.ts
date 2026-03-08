import { describe, expect, it, beforeEach, afterEach, mock } from "bun:test"
import { OatmealClient } from "../src/client"
import { ApiError, AuthError, ScopeError } from "../src/errors"

const mockFetch = mock<typeof globalThis.fetch>(() => Promise.resolve(new Response()))

describe("OatmealClient", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    mockFetch.mockReset()
    globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  }

  it("sends Authorization header when apiKey provided", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }))
    const client = new OatmealClient({ baseUrl: "http://localhost", apiKey: "sk_test" })
    await client.get("/test")
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const request = mockFetch.mock.calls[0]
    const init = request[1] as RequestInit
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer sk_test")
  })

  it("omits Authorization header when no apiKey", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }))
    const client = new OatmealClient({ baseUrl: "http://localhost" })
    await client.get("/test")
    const init = mockFetch.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>)["Authorization"]).toBeUndefined()
  })

  it("sends Content-Type on POST", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: "1" }))
    const client = new OatmealClient({ baseUrl: "http://localhost" })
    await client.post("/test", { name: "test" })
    const init = mockFetch.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json")
  })

  it("sends Content-Type on PATCH", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: "1" }))
    const client = new OatmealClient({ baseUrl: "http://localhost" })
    await client.patch("/test", { name: "updated" })
    const init = mockFetch.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json")
  })

  it("GET includes query params in URL", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ items: [] }))
    const client = new OatmealClient({ baseUrl: "http://localhost" })
    await client.get("/test", { params: { q: "search", page: 2 } })
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain("q=search")
    expect(url).toContain("page=2")
  })

  it("skips undefined query params", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ items: [] }))
    const client = new OatmealClient({ baseUrl: "http://localhost" })
    await client.get("/test", { params: { q: "test", page: undefined } })
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain("q=test")
    expect(url).not.toContain("page")
  })

  it("POST sends JSON body", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: "1" }))
    const client = new OatmealClient({ baseUrl: "http://localhost" })
    await client.post("/test", { name: "new" })
    const init = mockFetch.mock.calls[0][1] as RequestInit
    expect(init.body).toBe(JSON.stringify({ name: "new" }))
  })

  it("DELETE sends no body", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(undefined, 204))
    const client = new OatmealClient({ baseUrl: "http://localhost" })
    await client.delete("/test")
    const init = mockFetch.mock.calls[0][1] as RequestInit
    expect(init.body).toBeUndefined()
  })

  it("parses JSON response body", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: "1", name: "Test" }))
    const client = new OatmealClient({ baseUrl: "http://localhost" })
    const result = await client.get<{ id: string; name: string }>("/test")
    expect(result).toEqual({ id: "1", name: "Test" })
  })

  it("throws ApiError on 400", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: "Bad request" }, 400))
    const client = new OatmealClient({ baseUrl: "http://localhost" })
    await expect(client.get("/test")).rejects.toThrow(ApiError)
  })

  it("throws AuthError on 401", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: "Unauthorized" }, 401))
    const client = new OatmealClient({ baseUrl: "http://localhost" })
    await expect(client.get("/test")).rejects.toThrow(AuthError)
  })

  it("throws ScopeError on 403 with scope info", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "Forbidden", requiredScope: "hackathons:write" }, 403)
    )
    const client = new OatmealClient({ baseUrl: "http://localhost" })
    await expect(client.get("/test")).rejects.toThrow(ScopeError)
  })

  it("throws ApiError on 403 without scope info", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: "Forbidden" }, 403))
    const client = new OatmealClient({ baseUrl: "http://localhost" })
    try {
      await client.get("/test")
      expect(true).toBe(false)
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).status).toBe(403)
    }
  })

  it("throws ApiError on 404", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: "Not found" }, 404))
    const client = new OatmealClient({ baseUrl: "http://localhost" })
    try {
      await client.get("/test")
      expect(true).toBe(false)
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).status).toBe(404)
    }
  })

  it("retries once on 429 with Retry-After", async () => {
    const retryResponse = new Response(JSON.stringify({ error: "Rate limited" }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": "1" },
    })
    mockFetch
      .mockResolvedValueOnce(retryResponse)
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
    const client = new OatmealClient({ baseUrl: "http://localhost" })
    const result = await client.get("/test")
    expect(result).toEqual({ ok: true })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it("throws after second 429", async () => {
    const retryResponse1 = new Response(JSON.stringify({ error: "Rate limited" }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": "1" },
    })
    const retryResponse2 = new Response(JSON.stringify({ error: "Rate limited" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    })
    mockFetch
      .mockResolvedValueOnce(retryResponse1)
      .mockResolvedValueOnce(retryResponse2)
    const client = new OatmealClient({ baseUrl: "http://localhost" })
    await expect(client.get("/test")).rejects.toThrow(ApiError)
  })

  it("handles 204 No Content", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }))
    const client = new OatmealClient({ baseUrl: "http://localhost" })
    const result = await client.delete("/test")
    expect(result).toBeUndefined()
  })

  it("handles non-JSON error responses", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Internal Server Error", { status: 500, headers: { "Content-Type": "text/plain" } })
    )
    const client = new OatmealClient({ baseUrl: "http://localhost" })
    await expect(client.get("/test")).rejects.toThrow(ApiError)
  })

  it("constructs correct URLs", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}))
    const client = new OatmealClient({ baseUrl: "http://localhost:3000" })
    await client.get("/api/dashboard/hackathons")
    expect(mockFetch.mock.calls[0][0]).toBe("http://localhost:3000/api/dashboard/hackathons")
  })

  it("strips trailing slash from baseUrl", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}))
    const client = new OatmealClient({ baseUrl: "http://localhost:3000/" })
    await client.get("/test")
    expect(mockFetch.mock.calls[0][0]).toBe("http://localhost:3000/test")
  })
})
