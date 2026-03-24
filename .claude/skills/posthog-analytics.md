---
name: posthog-analytics
description: PostHog analytics setup, patterns, and troubleshooting for the Oatmeal platform. Use when debugging missing PostHog events, adding new tracked events, modifying the /ingest proxy, or troubleshooting analytics on production.
allowed-tools: Read, Glob, Grep, Bash(curl:*), Bash(vercel:*), Bash(git:*), Bash(bun:*), Write, Edit
---

# PostHog Analytics

## Architecture

PostHog is integrated at three levels:

1. **Client-side (browser)** — `instrumentation-client.ts` initializes `posthog-js` using the Next.js 15.3+ pattern. Auto-captures pageviews, clicks, and page leaves.
2. **User identification** — `components/posthog-provider.tsx` links Clerk auth to PostHog via `posthog.identify()` on sign-in and `posthog.reset()` on sign-out.
3. **Server-side** — `lib/analytics/posthog.ts` uses `posthog-node` to track conversion events (hackathon created, registration, submission) and API usage (CLI vs direct).

## Key Files

| File | Purpose |
|------|---------|
| `instrumentation-client.ts` | Client-side PostHog init (Next.js 15.3+ pattern) |
| `components/posthog-provider.tsx` | Clerk user identification + `PostHogProvider` wrapper |
| `lib/analytics/posthog.ts` | Server-side tracking (`trackEvent`, `identifyUser`, `isCliRequest`) |
| `next.config.ts` | `/ingest` rewrites to proxy PostHog through our domain |
| `proxy.ts` | Excludes `/ingest` from Clerk middleware |

## Proxy Setup

PostHog requests are proxied through `/ingest/*` to bypass ad blockers:

```
/ingest/static/*  →  https://us-assets.i.posthog.com/static/*
/ingest/*         →  https://us.i.posthog.com/*
```

Configured in `next.config.ts` rewrites. The `/ingest` path is excluded from Clerk middleware in `proxy.ts`.

**Critical: `skipTrailingSlashRedirect: true`** must be set in `next.config.ts`. Without it, Vercel 308-redirects `/ingest/e/` → `/ingest/e`, which drops the POST body and silently loses all events.

## Environment Variables

| Variable | Where | Value |
|----------|-------|-------|
| `NEXT_PUBLIC_POSTHOG_KEY` | Vercel Production only | `phc_aqn8c...` (from PostHog dashboard) |

**Do NOT set in `.env.local`** — local dev should not track. Do NOT set for Preview/Staging.

The host is not needed as an env var — the `/ingest` proxy path is hardcoded.

## CLI Tracking

The CLI sends `User-Agent: hackathon-cli/<version>` on all requests. Server-side v1 routes detect this via `isCliRequest(request)` from `lib/analytics/posthog.ts` and tag events with `source: "cli"` vs `source: "api"`.

No PostHog SDK or env vars are needed in the CLI package.

## Troubleshooting

### No events showing in PostHog dashboard

1. **Check the env var is set on Vercel Production:**
   ```bash
   vercel env ls | grep POSTHOG
   ```

2. **Check the key is baked into the client JS bundle:**
   ```bash
   curl -sL https://www.getoatmeal.com | grep -o '/_next/static/chunks/[^"]*\.js[^"]*' | while read chunk; do
     result=$(curl -sL "https://www.getoatmeal.com${chunk}" 2>&1 | grep -c 'phc_')
     if [ "$result" -gt "0" ]; then echo "Key found in $chunk"; break; fi
   done
   ```
   If not found, the env var was added after the last build. Trigger a redeploy: `vercel --prod`

3. **Check the /ingest proxy returns 200:**
   ```bash
   curl -s "https://www.getoatmeal.com/ingest/decide" | head -20
   ```
   Should return JSON from PostHog, not a redirect or error.

4. **Test sending an event directly:**
   ```bash
   curl -s -X POST "https://www.getoatmeal.com/ingest/e" \
     -H "Content-Type: application/json" \
     -d '{"api_key":"YOUR_KEY","event":"test","properties":{"distinct_id":"debug"}}'
   ```
   Should return `{"status":"Ok"}`. If you get `Redirecting...`, the trailing slash redirect fix is missing.

5. **Check for trailing slash redirects:**
   ```bash
   curl -sI -X POST "https://www.getoatmeal.com/ingest/e/" | grep -i "HTTP\|location"
   ```
   If you see a 308 redirect, `skipTrailingSlashRedirect: true` is missing from `next.config.ts`.

6. **Ad blockers** — Even with the proxy, some aggressive blockers detect PostHog by JS patterns. Test in incognito with extensions disabled.

### Events show but no user identification

- Check that Clerk is loaded and the user is signed in
- `PostHogIdentifier` in the provider watches `useAuth()` / `useUser()` and calls `posthog.identify(userId)` on sign-in
- Verify in browser console: `posthog.get_distinct_id()` should return the Clerk user ID after sign-in

### Server-side events not appearing

- `NEXT_PUBLIC_POSTHOG_KEY` must also be available server-side (it is, since Next.js exposes `NEXT_PUBLIC_*` to both)
- Server events include `environment` property from `VERCEL_ENV` — filter by this in PostHog
- Check that `trackEvent()` is being called (it's fire-and-forget, won't throw on failure)
