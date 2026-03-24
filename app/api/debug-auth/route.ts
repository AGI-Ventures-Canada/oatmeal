/**
 * Debug endpoint — bypasses Elysia entirely to test Clerk auth
 * at the pure Next.js route handler level.
 *
 * Hit GET /api/debug-auth in the browser while logged in.
 * TODO: Remove after #141 is resolved.
 */
import { auth } from "@clerk/nextjs/server"

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "(none)"
  const clerkCookies = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .filter((c) => c.startsWith("__clerk") || c.startsWith("__session"))
    .map((c) => {
      const [name, val] = c.split("=")
      return { name, length: val?.length ?? 0 }
    })

  let authResult: Record<string, unknown> = {}
  try {
    const session = await auth()
    authResult = {
      userId: session.userId,
      orgId: session.orgId,
      orgRole: session.orgRole,
      sessionClaims: session.sessionClaims ? "present" : "missing",
    }
  } catch (err) {
    authResult = { error: err instanceof Error ? err.message : String(err) }
  }

  return Response.json({
    clerkCookiesPresent: clerkCookies,
    totalCookies: cookieHeader.split(";").length,
    authResult,
    url: request.url,
    host: request.headers.get("host"),
  })
}
