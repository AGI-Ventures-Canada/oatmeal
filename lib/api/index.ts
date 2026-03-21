import { Elysia } from "elysia"
import { swagger } from "@elysiajs/swagger"
import { publicRoutes } from "./routes/public"
import { dashboardRoutes } from "./routes/dashboard"
import { v1Routes } from "./routes/v1"
import { importRoutes, dashboardImportRoutes } from "./routes/import"
import { adminRoutes } from "./routes/admin"

export const api = new Elysia({ prefix: "/api" })
  .use(
    swagger({
      path: "/swagger",
      documentation: {
        info: {
          title: "Oatmeal API",
          version: "1.0.0",
          description: `API for the Oatmeal hackathon platform.

## Authentication

- **Public endpoints** (\`/api/public/*\`): No authentication required
- **Dashboard endpoints** (\`/api/dashboard/*\`): Requires Clerk session **or** API key (dual-auth)
- **Integration endpoints** (\`/api/v1/*\`): Requires API key in Authorization header

## API Key Authentication

\`\`\`
Authorization: Bearer sk_live_your_api_key_here
\`\`\`
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
  .use(importRoutes)
  .use(dashboardImportRoutes)
  .use(dashboardRoutes)
  .use(v1Routes)
  .use(adminRoutes)

export type Api = typeof api
