// TODO: Replace with Redis/Upstash for production. In-memory Map doesn't persist
// across serverless cold starts and isn't shared across instances.

type RateLimitEntry = {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export type RateLimitConfig = {
  maxRequests: number
  windowMs: number
}

export const defaultRateLimits: Record<string, RateLimitConfig> = {
  "api_key:default": { maxRequests: 100, windowMs: 60_000 },
  "user:default": { maxRequests: 200, windowMs: 60_000 },
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = defaultRateLimits["api_key:default"]
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + config.windowMs
    rateLimitStore.set(key, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt,
    }
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  entry.count++
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
  }
}

export class RateLimitError extends Error {
  constructor(
    public resetAt: number,
    public remaining: number
  ) {
    super("Rate limit exceeded")
    this.name = "RateLimitError"
  }
}

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}, 60_000)
