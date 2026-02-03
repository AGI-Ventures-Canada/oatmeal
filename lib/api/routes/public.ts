import { Elysia } from "elysia"

export const publicRoutes = new Elysia({ prefix: "/public" })
  .get("/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }))
  .get("/integrations/:provider/callback", async ({ params, query }) => {
    const { provider } = params
    const code = query.code as string | undefined
    const state = query.state as string | undefined
    const error = query.error as string | undefined

    if (error) {
      const safeError = error
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
      return new Response(
        `<html><body><h1>Error</h1><p>${safeError}</p><script>window.close()</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      )
    }

    if (!code || !state) {
      return new Response(
        `<html><body><h1>Error</h1><p>Missing code or state</p></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      )
    }

    let stateData: { tenantId: string; userId: string }
    try {
      stateData = JSON.parse(Buffer.from(state, "base64url").toString())
    } catch {
      return new Response(
        `<html><body><h1>Error</h1><p>Invalid state</p></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      )
    }

    const { exchangeCodeForTokens, saveIntegration, getProviderConfig } = await import(
      "@/lib/integrations/oauth"
    )

    const providerType = provider as "gmail" | "google_calendar" | "notion" | "luma"
    const config = getProviderConfig(providerType)

    if (!config) {
      return new Response(
        `<html><body><h1>Error</h1><p>Provider not configured</p></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      )
    }

    const tokens = await exchangeCodeForTokens(providerType, code)

    if (!tokens) {
      return new Response(
        `<html><body><h1>Error</h1><p>Token exchange failed</p></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      )
    }

    await saveIntegration({
      tenantId: stateData.tenantId,
      provider: providerType,
      accountEmail: tokens.email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      scopes: config.scopes,
    })

    return new Response(
      `<html><body><h1>Success!</h1><p>${provider} connected successfully.</p><script>setTimeout(() => window.close(), 2000)</script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    )
  })
  .get("/hackathons/:slug", async ({ params }) => {
    const { getPublicHackathon } = await import("@/lib/services/public-hackathons")
    const hackathon = await getPublicHackathon(params.slug)

    if (!hackathon) {
      return new Response(JSON.stringify({ error: "Hackathon not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    return {
      id: hackathon.id,
      name: hackathon.name,
      slug: hackathon.slug,
      description: hackathon.description,
      rules: hackathon.rules,
      bannerUrl: hackathon.banner_url,
      status: hackathon.status,
      startsAt: hackathon.starts_at,
      endsAt: hackathon.ends_at,
      registrationOpensAt: hackathon.registration_opens_at,
      registrationClosesAt: hackathon.registration_closes_at,
      organizer: {
        id: hackathon.organizer.id,
        name: hackathon.organizer.name,
        slug: hackathon.organizer.slug,
        logoUrl: hackathon.organizer.logo_url,
      },
      sponsors: hackathon.sponsors.map((s) => ({
        id: s.id,
        name: s.name,
        logoUrl: s.logo_url,
        websiteUrl: s.website_url,
        tier: s.tier,
        tenant: s.tenant
          ? {
              slug: s.tenant.slug,
              name: s.tenant.name,
              logoUrl: s.tenant.logo_url,
            }
          : null,
      })),
    }
  })
  .get("/hackathons", async () => {
    const { listPublicHackathons } = await import("@/lib/services/public-hackathons")
    const hackathons = await listPublicHackathons()

    return {
      hackathons: hackathons.map((h) => ({
        id: h.id,
        name: h.name,
        slug: h.slug,
        description: h.description,
        bannerUrl: h.banner_url,
        status: h.status,
        startsAt: h.starts_at,
        endsAt: h.ends_at,
        organizer: {
          id: h.organizer.id,
          name: h.organizer.name,
          slug: h.organizer.slug,
          logoUrl: h.organizer.logo_url,
        },
      })),
    }
  })
  .get("/orgs/:slug", async ({ params }) => {
    const { getPublicTenantWithHackathons } = await import("@/lib/services/tenant-profiles")
    const tenant = await getPublicTenantWithHackathons(params.slug)

    if (!tenant) {
      return new Response(JSON.stringify({ error: "Organization not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logo_url,
      description: tenant.description,
      websiteUrl: tenant.website_url,
      hackathons: tenant.hackathons.map((h) => ({
        id: h.id,
        name: h.name,
        slug: h.slug,
        status: h.status,
        startsAt: h.starts_at,
        endsAt: h.ends_at,
      })),
    }
  })
