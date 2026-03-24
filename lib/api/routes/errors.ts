import { AuthError } from "@/lib/auth/principal"
import { RateLimitError, getRateLimitHeaders } from "@/lib/services/rate-limit"

export function handleRouteError(error: unknown): Response {
  if (error instanceof AuthError || (error instanceof Error && error.name === "AuthError")) {
    const e = error as AuthError
    return new Response(JSON.stringify({ error: e.message }), {
      status: e.statusCode,
      headers: { "Content-Type": "application/json" },
    })
  }
  if (error instanceof RateLimitError || (error instanceof Error && error.name === "RateLimitError")) {
    const e = error as RateLimitError
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...getRateLimitHeaders({ allowed: false, remaining: e.remaining, resetAt: e.resetAt }),
      },
    })
  }
  console.error("[api] unhandled error", error)
  return new Response(JSON.stringify({ error: "Internal server error" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  })
}
