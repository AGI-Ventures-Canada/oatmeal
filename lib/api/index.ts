import { Elysia } from "elysia"
import { swagger } from "@elysiajs/swagger"
import { publicRoutes } from "./routes/public"
import { dashboardRoutes } from "./routes/dashboard"
import { v1Routes } from "./routes/v1"

export const api = new Elysia({ prefix: "/api" })
  .use(
    swagger({
      path: "/swagger",
      documentation: {
        info: {
          title: "Agents Server API",
          version: "1.0.0",
          description: `API for running AI agents at scale.

## Authentication

- **Public endpoints** (\`/api/public/*\`): No authentication required
- **Dashboard endpoints** (\`/api/dashboard/*\`): Requires Clerk session (browser only)
- **Integration endpoints** (\`/api/v1/*\`): Requires API key in Authorization header

## API Key Authentication

\`\`\`
Authorization: Bearer sk_live_your_api_key_here
\`\`\`

## Code Samples

See [API_SAMPLES.md](https://github.com/AGI-Ventures-Canada/agents-server/blob/main/lib/api/API_SAMPLES.md) for complete code samples in TypeScript, Python, and curl.
`,
        },
        tags: [
          { name: "public", description: "Public endpoints (no auth)" },
          { name: "dashboard", description: "Dashboard endpoints (Clerk auth)" },
          { name: "v1", description: "Integration endpoints (API key auth)" },
        ],
        components: {
          securitySchemes: {
            apiKey: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "API Key",
              description: "API key (sk_live_...)",
            },
          },
        },
      },
    })
  )
  .use(publicRoutes)
  .use(dashboardRoutes)
  .use(v1Routes)

export type Api = typeof api
