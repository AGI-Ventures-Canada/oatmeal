import { Elysia } from "elysia"
import { swagger } from "@elysiajs/swagger"

export const api = new Elysia({ prefix: "/api" })
  .use(swagger({ path: "/swagger" }))
  .get("/public/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }))

export type Api = typeof api
