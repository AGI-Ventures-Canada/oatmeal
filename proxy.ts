/**
 * Next.js 16 Proxy/Middleware
 *
 * This file is named `proxy.ts` per Next.js 16 conventions (replaces middleware.ts).
 * It wraps Clerk's middleware to protect dashboard routes.
 *
 * Protected routes: /keys/*, /jobs/*
 * Public routes: Everything else (including /api/*, /sign-in, /sign-up)
 */
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isProtectedRoute = createRouteMatcher(["/home(.*)", "/browse(.*)", "/settings(.*)", "/keys(.*)", "/schedules(.*)", "/webhooks(.*)", "/integrations(.*)", "/jobs(.*)", "/admin(.*)"])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
