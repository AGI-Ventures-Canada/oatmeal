---
name: oatmeal-cli
model: sonnet
description: Control the Oatmeal hackathon platform via its REST API from an AI coding agent. Use when the user asks to create hackathons, add judges, manage prizes, configure judging, publish results, or perform any hackathon management task through API calls.
activationKeywords:
  - "create a hackathon"
  - "make a hackathon"
  - "add a judge"
  - "set up judging"
  - "add a prize"
  - "publish results"
  - "manage hackathon"
  - "hackathon on"
  - "oatmeal api"
  - "oatmeal cli"
---

# Oatmeal CLI — Agent Skill

Manage the Oatmeal hackathon platform programmatically via its REST API. This skill enables AI coding agents to create hackathons, manage judges, configure prizes, publish results, and more — all through `curl` commands.

## Reference Files

- `references/api-endpoints.md` — Complete API endpoint catalog organized by category with request/response shapes
- `references/workflow-examples.md` — Natural language to API call mappings, common workflows, and end-to-end examples

## When to Activate

- User asks to create, update, or manage a hackathon
- User asks to add/remove judges, sponsors, or prizes
- User asks to configure judging criteria or assignments
- User asks to calculate or publish results
- User asks to register for a hackathon or manage submissions
- User asks to set up webhooks or schedules
- User mentions "oatmeal" in the context of hackathon management
- User gives natural language commands like "make me a hackathon on Sunday from 7am to 9pm"

## When NOT to Activate

- User is working on the Oatmeal codebase itself (editing source code, running tests, etc.)
- User is asking about general hackathon concepts unrelated to the platform
- User is working with the Oatmeal web dashboard UI directly

## Prerequisites

Before making API calls, the user needs:

1. **A running Oatmeal instance** — either local (`http://localhost:3000`) or production
2. **An API key** — obtained from the dashboard at `/hackathons` > Settings > API Keys
3. **An organization** — the user must belong to a Clerk organization

### Step 1: Verify the Instance

```bash
curl -s "http://localhost:3000/api/public/health" | jq .
```

Expected: `{"status":"ok","timestamp":"..."}`

If this fails, the Oatmeal server is not running. The user needs to start it with `bun dev` (if local) or provide their production URL.

### Step 2: Set Up Authentication

Store the API key and base URL as environment variables for all subsequent calls:

```bash
export OATMEAL_URL="http://localhost:3000"
export OATMEAL_KEY="sk_live_your_api_key_here"
```

Test authentication:

```bash
curl -s -H "Authorization: Bearer $OATMEAL_KEY" \
  "$OATMEAL_URL/api/v1/whoami" | jq .
```

If the user doesn't have an API key yet, they need to create one from the web dashboard (Settings > API Keys). API key creation requires a browser session and cannot be done via API.

### Step 3: Verify Organization

```bash
curl -s -H "Authorization: Bearer $OATMEAL_KEY" \
  "$OATMEAL_URL/api/dashboard/me" | jq .
```

This returns the current principal info including organization details.

## Core Workflows

### Create a Hackathon

When users say things like "make me a hackathon on Sunday from 7am to 9pm":

1. **Parse the dates** — convert natural language to ISO 8601 timestamps
2. **Create the hackathon** — `POST /api/dashboard/hackathons`
3. **Configure settings** — `PATCH /api/dashboard/hackathons/:id/settings`

```bash
curl -s -X POST -H "Authorization: Bearer $OATMEAL_KEY" \
  -H "Content-Type: application/json" \
  "$OATMEAL_URL/api/dashboard/hackathons" \
  -d '{
    "name": "Sunday AI Hackathon",
    "slug": "sunday-ai-hackathon",
    "description": "A one-day AI hackathon",
    "startsAt": "2026-03-15T07:00:00Z",
    "endsAt": "2026-03-15T21:00:00Z",
    "registrationOpensAt": "2026-03-08T00:00:00Z",
    "registrationClosesAt": "2026-03-15T06:00:00Z"
  }' | jq .
```

**Date handling rules:**
- Always convert relative dates ("this Sunday", "next Friday") to absolute ISO 8601 timestamps
- Use the user's timezone if known, otherwise ask
- Registration typically opens immediately and closes at or before the hackathon start time
- Default status is `draft` — remind the user to publish when ready

### Update Hackathon Settings

```bash
curl -s -X PATCH -H "Authorization: Bearer $OATMEAL_KEY" \
  -H "Content-Type: application/json" \
  "$OATMEAL_URL/api/dashboard/hackathons/{HACKATHON_ID}/settings" \
  -d '{
    "status": "published",
    "name": "Updated Name"
  }' | jq .
```

Valid statuses: `draft`, `published`, `registration_open`, `active`, `judging`, `completed`, `archived`

### Add a Judge

When users say "add this judge to my hackathon":

```bash
# By email (sends invitation if user not found)
curl -s -X POST -H "Authorization: Bearer $OATMEAL_KEY" \
  -H "Content-Type: application/json" \
  "$OATMEAL_URL/api/dashboard/hackathons/{HACKATHON_ID}/judging/judges" \
  -d '{"email": "judge@example.com"}' | jq .
```

### Set Up Judging Criteria

```bash
curl -s -X POST -H "Authorization: Bearer $OATMEAL_KEY" \
  -H "Content-Type: application/json" \
  "$OATMEAL_URL/api/dashboard/hackathons/{HACKATHON_ID}/judging/criteria" \
  -d '{
    "name": "Innovation",
    "description": "How novel and creative is the solution?",
    "maxScore": 10,
    "weight": 1.0,
    "displayOrder": 1
  }' | jq .
```

### Create a Prize

```bash
curl -s -X POST -H "Authorization: Bearer $OATMEAL_KEY" \
  -H "Content-Type: application/json" \
  "$OATMEAL_URL/api/dashboard/hackathons/{HACKATHON_ID}/prizes" \
  -d '{
    "name": "First Place",
    "description": "Grand prize for the winning team",
    "value": "$5,000",
    "displayOrder": 1
  }' | jq .
```

### Calculate and Publish Results

```bash
# Calculate rankings from scores
curl -s -X POST -H "Authorization: Bearer $OATMEAL_KEY" \
  "$OATMEAL_URL/api/dashboard/hackathons/{HACKATHON_ID}/results/calculate" | jq .

# Review results before publishing
curl -s -H "Authorization: Bearer $OATMEAL_KEY" \
  "$OATMEAL_URL/api/dashboard/hackathons/{HACKATHON_ID}/results" | jq .

# Publish results (makes them public, transitions to completed)
curl -s -X POST -H "Authorization: Bearer $OATMEAL_KEY" \
  "$OATMEAL_URL/api/dashboard/hackathons/{HACKATHON_ID}/results/publish" | jq .
```

## Finding the Current Hackathon

When a user says "my current hackathon" or "my hackathon", list their hackathons and pick the most recent active one:

```bash
curl -s -H "Authorization: Bearer $OATMEAL_KEY" \
  "$OATMEAL_URL/api/dashboard/hackathons" | jq .
```

Look for the hackathon with the most recent `startsAt` date or `active`/`published` status. If ambiguous, ask the user which one they mean.

## Route Namespace Guide

| Namespace | Auth | Use For |
|-----------|------|---------|
| `/api/public/*` | None (some need Clerk session) | Browsing, registration, judging UI |
| `/api/dashboard/*` | API key OR Clerk session | All management operations |
| `/api/v1/*` | API key only | Jobs, webhooks (programmatic) |

**For agent use, always use `/api/dashboard/*` endpoints with API key auth.** The `/api/v1/*` endpoints are for async job processing and webhook setup.

## API Key Scopes

API keys have scoped permissions. Common scopes needed:

| Scope | Operations |
|-------|-----------|
| `hackathons:read` | List/get hackathons, criteria, judges, results |
| `hackathons:write` | Create/update hackathons, manage judging, prizes |
| `webhooks:read` | List webhooks |
| `webhooks:write` | Create/delete webhooks |
| `schedules:read` | List schedules |
| `schedules:write` | Create/update/delete schedules |
| `org:read` | Read organization profile |
| `org:write` | Update organization profile |

For full management, ensure the API key has both `hackathons:read` and `hackathons:write` scopes.

## Error Handling

All API errors return JSON with a consistent shape:

```json
{"code": "error_code", "message": "Human-readable message"}
```

Common errors:
- `401` — Missing or invalid API key. Check `$OATMEAL_KEY` is set correctly.
- `403` — API key lacks required scope. User needs to create a new key with proper permissions.
- `404` — Resource not found. Verify the hackathon ID exists.
- `409` — Conflict (e.g., duplicate registration, slug already taken).
- `422` — Validation error. Check the request body matches the expected schema.

## Tips for AI Agents

1. **Always store IDs** — After creating a resource, capture the returned `id` for use in subsequent calls
2. **Check before creating** — List existing resources before creating duplicates
3. **Parse dates carefully** — Convert "this Sunday" to the correct ISO 8601 date using the current date context
4. **Confirm destructive actions** — Ask the user before deleting resources or publishing results
5. **Use jq for readability** — Pipe responses through `jq .` for formatted output
6. **Batch operations** — When setting up a full hackathon, create all criteria, then all prizes, then add judges
7. **Default to draft** — Create hackathons in draft status and let the user decide when to publish

## Full API Reference

For the complete endpoint catalog with request/response shapes, see `references/api-endpoints.md`.

For end-to-end workflow examples with natural language mappings, see `references/workflow-examples.md`.
