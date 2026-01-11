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
          description: "API for running AI agents at scale",
        },
        tags: [
          { name: "public", description: "Public endpoints (no auth)" },
          { name: "dashboard", description: "Dashboard endpoints (Clerk auth)" },
          { name: "v1", description: "Integration endpoints (API key auth)" },
        ],
      },
    })
  )
  .use(publicRoutes)
  .use(dashboardRoutes)
  .use(v1Routes)

export type Api = typeof api
