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
      return new Response(
        `<html><body><h1>Error</h1><p>${error}</p><script>window.close()</script></body></html>`,
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
