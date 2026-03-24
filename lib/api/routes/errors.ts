import type { HTTPHeaders } from "elysia"
import { AuthError } from "@/lib/auth/principal"
import { RateLimitError, getRateLimitHeaders } from "@/lib/services/rate-limit"

type ElysiaSet = { status?: number | string; headers: HTTPHeaders }

export function handleRouteError(
  error: unknown,
  set: ElysiaSet,
  path?: string
): { error: string } | undefined {
  if (error instanceof AuthError || (error instanceof Error && error.name === "AuthError")) {
    const e = error as AuthError
    set.status = e.statusCode
    return { error: e.message }
  }
  if (error instanceof RateLimitError || (error instanceof Error && error.name === "RateLimitError")) {
    const e = error as RateLimitError
    set.status = 429
    Object.assign(set.headers, getRateLimitHeaders({ allowed: false, remaining: e.remaining, resetAt: e.resetAt }))
    return { error: "Rate limit exceeded" }
  }
  if (error && typeof error === "object" && "code" in error) {
    return undefined
  }
  const location = path ? ` on ${path}` : ""
  console.error(`[api] unhandled error${location}:`, error instanceof Error ? error.message : error, error instanceof Error ? error.stack : "")
  set.status = 500
  return { error: "Internal server error" }
}
