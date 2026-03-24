import { describe, it, expect, beforeEach } from "bun:test"
import {
  mockAuth,
  resetAllMocks,
  setMockFromImplementation,
  createChainableMock,
} from "./supabase-mock"

const { resolvePrincipal, withPreResolvedAuth } = await import("@/lib/auth/principal")

describe("resolvePrincipal", () => {
  beforeEach(() => {
    resetAllMocks()
  })

  it("returns anon when Clerk session has no userId", async () => {
    mockAuth.mockImplementation(() =>
      Promise.resolve({ userId: null, orgId: null, orgRole: null })
    )

    const request = new Request("http://localhost/api/dashboard/hackathons")
    const principal = await resolvePrincipal(request)

    expect(principal.kind).toBe("anon")
  })

  it("returns user principal when org tenant exists", async () => {
    mockAuth.mockImplementation(() =>
      Promise.resolve({
        userId: "user_abc",
        orgId: "org_xyz",
        orgRole: "org:admin",
        sessionClaims: {},
      })
    )

    setMockFromImplementation(() =>
      createChainableMock({
        data: { id: "tenant-123", clerk_org_id: "org_xyz", name: "Test Org" },
        error: null,
      })
    )

    const request = new Request("http://localhost/api/dashboard/hackathons")
    const principal = await resolvePrincipal(request)

    expect(principal.kind).toBe("user")
    if (principal.kind === "user") {
      expect(principal.tenantId).toBe("tenant-123")
      expect(principal.userId).toBe("user_abc")
      expect(principal.orgId).toBe("org_xyz")
    }
  })

  it("returns user principal when personal tenant exists", async () => {
    mockAuth.mockImplementation(() =>
      Promise.resolve({
        userId: "user_personal",
        orgId: null,
        orgRole: null,
        sessionClaims: {},
      })
    )

    setMockFromImplementation(() =>
      createChainableMock({
        data: { id: "personal-tenant-456", clerk_user_id: "user_personal", name: "Personal" },
        error: null,
      })
    )

    const request = new Request("http://localhost/api/dashboard/hackathons")
    const principal = await resolvePrincipal(request)

    expect(principal.kind).toBe("user")
    if (principal.kind === "user") {
      expect(principal.tenantId).toBe("personal-tenant-456")
      expect(principal.orgId).toBeNull()
    }
  })

  it("returns anon when tenant creation returns null", async () => {
    mockAuth.mockImplementation(() =>
      Promise.resolve({
        userId: "user_abc",
        orgId: "org_xyz",
        orgRole: "org:member",
        sessionClaims: {},
      })
    )

    setMockFromImplementation(() =>
      createChainableMock({ data: null, error: null })
    )

    const request = new Request("http://localhost/api/dashboard/hackathons")
    const principal = await resolvePrincipal(request)

    expect(principal.kind).toBe("anon")
  })

  it("returns anon when Clerk auth() throws", async () => {
    mockAuth.mockImplementation(() => {
      throw new Error("Clerk connection failed")
    })

    const request = new Request("http://localhost/api/dashboard/hackathons")
    const principal = await resolvePrincipal(request)

    expect(principal.kind).toBe("anon")
  })

  it("returns anon when tenant DB query throws", async () => {
    mockAuth.mockImplementation(() =>
      Promise.resolve({
        userId: "user_abc",
        orgId: "org_xyz",
        orgRole: "org:member",
        sessionClaims: {},
      })
    )

    setMockFromImplementation(() => {
      throw new Error("DB connection failed")
    })

    const request = new Request("http://localhost/api/dashboard/hackathons")
    const principal = await resolvePrincipal(request)

    expect(principal.kind).toBe("anon")
  })

  it("caches principal per request (WeakMap)", async () => {
    let callCount = 0
    mockAuth.mockImplementation(() => {
      callCount++
      return Promise.resolve({
        userId: "user_abc",
        orgId: "org_xyz",
        orgRole: "org:admin",
        sessionClaims: {},
      })
    })

    setMockFromImplementation(() =>
      createChainableMock({
        data: { id: "tenant-123", clerk_org_id: "org_xyz", name: "Test Org" },
        error: null,
      })
    )

    const request = new Request("http://localhost/api/dashboard/hackathons")
    const principal1 = await resolvePrincipal(request)
    const principal2 = await resolvePrincipal(request)

    expect(principal1).toBe(principal2)
    expect(callCount).toBe(1)
  })

  it("does not share cache between different requests", async () => {
    let callCount = 0
    mockAuth.mockImplementation(() => {
      callCount++
      return Promise.resolve({
        userId: "user_abc",
        orgId: "org_xyz",
        orgRole: "org:admin",
        sessionClaims: {},
      })
    })

    setMockFromImplementation(() =>
      createChainableMock({
        data: { id: "tenant-123", clerk_org_id: "org_xyz", name: "Test Org" },
        error: null,
      })
    )

    const request1 = new Request("http://localhost/api/dashboard/hackathons")
    const request2 = new Request("http://localhost/api/dashboard/hackathons/123")
    await resolvePrincipal(request1)
    await resolvePrincipal(request2)

    expect(callCount).toBe(2)
  })
})

describe("resolvePrincipal with Elysia double derive", () => {
  beforeEach(() => {
    resetAllMocks()
  })

  it("parent + child derive produce same principal via cache", async () => {
    const { Elysia } = await import("elysia")

    mockAuth.mockImplementation(() =>
      Promise.resolve({
        userId: "user_abc",
        orgId: "org_xyz",
        orgRole: "org:admin",
        sessionClaims: {},
      })
    )

    setMockFromImplementation(() =>
      createChainableMock({
        data: { id: "tenant-123", clerk_org_id: "org_xyz", name: "Test Org" },
        error: null,
      })
    )

    let parentPrincipal: unknown = null
    let childPrincipal: unknown = null

    const childRoutes = new Elysia()
      .derive(async ({ request }) => {
        const principal = await resolvePrincipal(request)
        childPrincipal = principal
        return { principal }
      })
      .get("/test", ({ principal }) => {
        return { kind: principal.kind }
      })

    const app = new Elysia()
      .derive(async ({ request }) => {
        const principal = await resolvePrincipal(request)
        parentPrincipal = principal
        return { principal }
      })
      .use(childRoutes)

    const response = await app.handle(new Request("http://localhost/test"))
    const data = await response.json()

    expect(data.kind).toBe("user")
    expect(parentPrincipal).toBe(childPrincipal)
  })

  it("child derive uses cached principal even when auth would fail on second call", async () => {
    const { Elysia } = await import("elysia")

    let authCallCount = 0
    mockAuth.mockImplementation(() => {
      authCallCount++
      if (authCallCount === 1) {
        return Promise.resolve({
          userId: "user_abc",
          orgId: "org_xyz",
          orgRole: "org:admin",
          sessionClaims: {},
        })
      }
      return Promise.resolve({ userId: null, orgId: null, orgRole: null })
    })

    setMockFromImplementation(() =>
      createChainableMock({
        data: { id: "tenant-123", clerk_org_id: "org_xyz", name: "Test Org" },
        error: null,
      })
    )

    const childRoutes = new Elysia()
      .derive(async ({ request }) => {
        const principal = await resolvePrincipal(request)
        return { principal }
      })
      .get("/test", ({ principal }) => {
        return { kind: principal.kind, tenantId: principal.kind === "user" ? principal.tenantId : null }
      })

    const app = new Elysia()
      .derive(async ({ request }) => {
        const principal = await resolvePrincipal(request)
        return { principal }
      })
      .use(childRoutes)

    const response = await app.handle(new Request("http://localhost/test"))
    const data = await response.json()

    expect(data.kind).toBe("user")
    expect(data.tenantId).toBe("tenant-123")
    expect(authCallCount).toBe(1)
  })
})

describe("withPreResolvedAuth", () => {
  beforeEach(() => {
    resetAllMocks()
  })

  it("passes Clerk session via AsyncLocalStorage so resolvePrincipal uses it", async () => {
    let authCallCount = 0
    mockAuth.mockImplementation(() => {
      authCallCount++
      return Promise.resolve({
        userId: "user_abc",
        orgId: "org_xyz",
        orgRole: "org:admin",
        sessionClaims: {},
      })
    })

    setMockFromImplementation(() =>
      createChainableMock({
        data: { id: "tenant-123", clerk_org_id: "org_xyz", name: "Test Org" },
        error: null,
      })
    )

    const request = new Request("http://localhost/api/dashboard/hackathons")

    await withPreResolvedAuth(request, async () => {
      // auth() was called once by withPreResolvedAuth
      expect(authCallCount).toBe(1)

      // Now make auth() return anon (simulating lost async context in Elysia)
      mockAuth.mockImplementation(() =>
        Promise.resolve({ userId: null, orgId: null, orgRole: null })
      )

      // resolvePrincipal should use the pre-resolved session from AsyncLocalStorage
      const principal = await resolvePrincipal(request)
      expect(principal.kind).toBe("user")
      if (principal.kind === "user") {
        expect(principal.tenantId).toBe("tenant-123")
      }
      // auth() should NOT have been called again
      expect(authCallCount).toBe(1)
    })
  })

  it("skips pre-resolve for API key requests", async () => {
    let authCallCount = 0
    mockAuth.mockImplementation(() => {
      authCallCount++
      return Promise.resolve({ userId: null, orgId: null, orgRole: null })
    })

    const request = new Request("http://localhost/api/dashboard/hackathons", {
      headers: { Authorization: "Bearer sk_live_abc123" },
    })

    await withPreResolvedAuth(request, async () => {
      // auth() should NOT be called for API key requests
      expect(authCallCount).toBe(0)
    })
  })
})
