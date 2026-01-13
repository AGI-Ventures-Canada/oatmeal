import { Elysia } from "elysia"
import type { Json } from "@/lib/db/types"

export const publicRoutes = new Elysia({ prefix: "/public" })
  .get("/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }))
  // ============================================================================
  // Resend Inbound Email Webhook
  // ============================================================================
  .post("/webhooks/resend", async ({ request, body }) => {
    const svixId = request.headers.get("svix-id")
    const svixTimestamp = request.headers.get("svix-timestamp")
    const svixSignature = request.headers.get("svix-signature")

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response(JSON.stringify({ error: "Missing webhook headers" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { verifyResendWebhook } = await import("@/lib/email/resend")
    const rawBody = JSON.stringify(body)
    const isValid = verifyResendWebhook(rawBody, {
      svixId,
      svixTimestamp,
      svixSignature,
    })

    if (!isValid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const event = body as {
      type: string
      data: {
        email_id: string
        from: string
        to: string[]
        subject?: string
        text?: string
        html?: string
        attachments?: Array<{ id: string; filename: string; content_type: string }>
      }
    }

    if (event.type === "email.received") {
      const {
        getEmailAddressByAddress,
        storeInboundEmail,
        buildEmailTriggerInput,
      } = await import("@/lib/services/triggers")
      const { createAgentRun } = await import("@/lib/services/agent-runs")
      const { getReceivedEmail } = await import("@/lib/email/resend")

      const toAddress = event.data.to[0]
      const emailConfig = await getEmailAddressByAddress(toAddress)

      if (!emailConfig) {
        console.log(`No email config found for address: ${toAddress}`)
        return { received: true, processed: false, reason: "No agent configured" }
      }

      let emailContent = {
        text: event.data.text,
        html: event.data.html,
      }

      if (!emailContent.text && !emailContent.html && event.data.email_id) {
        const fullEmail = await getReceivedEmail(event.data.email_id)
        if (fullEmail) {
          emailContent = {
            text: fullEmail.text,
            html: fullEmail.html,
          }
        }
      }

      const inboundEmail = await storeInboundEmail({
        emailAddressId: emailConfig.id,
        resendEmailId: event.data.email_id,
        fromAddress: event.data.from,
        subject: event.data.subject,
        bodyText: emailContent.text,
        bodyHtml: emailContent.html,
        attachments: event.data.attachments as Json,
      })

      if (!inboundEmail) {
        console.error("Failed to store inbound email")
        return { received: true, processed: false, reason: "Storage failed" }
      }

      if (!emailConfig.agent_id) {
        return { received: true, processed: false, reason: "No agent linked" }
      }

      const triggerInput = buildEmailTriggerInput(emailConfig, inboundEmail)

      const run = await createAgentRun({
        tenantId: emailConfig.tenant_id,
        agentId: emailConfig.agent_id,
        triggerType: "email",
        input: triggerInput as unknown as Json,
      })

      if (run) {
        const { updateInboundEmailAgentRun } = await import("@/lib/services/triggers")
        await updateInboundEmailAgentRun(inboundEmail.id, run.id)

        const { start } = await import("workflow/api")
        const { runAgentWorkflow } = await import("@/lib/workflows/agents")

        await start(runAgentWorkflow, [{
          runId: run.id,
          agentId: emailConfig.agent_id,
          tenantId: emailConfig.tenant_id,
          triggerInput,
        }])
      }

      return { received: true, processed: true, runId: run?.id }
    }

    return { received: true, type: event.type }
  })
  // ============================================================================
  // Luma Webhook
  // ============================================================================
  .post("/webhooks/luma/:token", async ({ params, body }) => {
    const { token } = params

    const { getLumaWebhookConfigByToken, storeLumaWebhookEvent, buildLumaTriggerInput } =
      await import("@/lib/services/triggers")

    const config = await getLumaWebhookConfigByToken(token)

    if (!config) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!config.is_active) {
      return new Response(JSON.stringify({ error: "Webhook disabled" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    const event = body as {
      type: string
      data: unknown
    }

    const eventType = event.type as
      | "event.created"
      | "event.updated"
      | "guest.registered"
      | "guest.updated"
      | "ticket.registered"

    if (!config.event_types.includes(eventType)) {
      return { received: true, processed: false, reason: "Event type not configured" }
    }

    await storeLumaWebhookEvent({
      configId: config.id,
      eventType,
      payload: event.data as Json,
    })

    if (!config.agent_id) {
      return { received: true, processed: false, reason: "No agent linked" }
    }

    const triggerInput = buildLumaTriggerInput(config, eventType, event.data as Json)

    const { createAgentRun } = await import("@/lib/services/agent-runs")
    const run = await createAgentRun({
      tenantId: config.tenant_id,
      agentId: config.agent_id,
      triggerType: "luma_webhook",
      input: triggerInput as unknown as Json,
    })

    if (run) {
      const { start } = await import("workflow/api")
      const { runAgentWorkflow } = await import("@/lib/workflows/agents")

      await start(runAgentWorkflow, [{
        runId: run.id,
        agentId: config.agent_id,
        tenantId: config.tenant_id,
        triggerInput,
      }])
    }

    return { received: true, processed: true, runId: run?.id }
  })
  // ============================================================================
  // OAuth Callbacks
  // ============================================================================
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
