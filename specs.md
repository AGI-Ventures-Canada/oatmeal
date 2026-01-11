## Current Status

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Baseline deploy | DONE |
| 1 | Clerk Org dashboard auth | TODO |
| 2 | API key provisioning | TODO |
| 3 | Integration auth + whoami | TODO |
| 4 | Jobs API (start + poll) | TODO |
| 5 | Workflow runner | TODO |
| 6 | Dashboard jobs UI | TODO |
| 7 | Hardening | TODO |
| 8 | Webhooks | LATER |

---

## Problem

- As part of [Masterplan: end-to-end general purpose agents for everyday business processes](https://www.notion.so/Masterplan-end-to-end-general-purpose-agents-for-everyday-business-processes-2e4ffe5c4f74804eae19d3c3e7bbdcea?pvs=21)
- Need a running server with basic things first, then build features later.

## Goal

Build an API + dashboard where:

- **Dashboard users** auth with **Clerk** (org-based relations to everything)
- **External integrations** auth with **API keys**
- **Long tasks** run in **Vercel Workflow**
- Support agent skill
- Clients mostly **poll** job status (webhooks later)

---

## Core idea: one request → one “principal”

A **principal** is “who is calling”.

Types:

- **user**: Clerk user + active Org
- **api_key**: integration key tied to an Org/tenant
- **anon**: no auth

Every route declares which principals it accepts:

- **dashboard routes**: user only
- **integration routes**: api_key only
- **public routes**: anon
- some routes can accept **either** (ex: read job status)

---

## Route namespaces

Keep it simple and hard to mess up:

- `/api/dashboard/*` → **Clerk user only**
- `/api/v1/*` → **API key only**
- `/api/public/*` → **no auth**

---

## Data model (Supabase)

### `tenants`

Maps Clerk Org → internal tenant id.

- `id` uuid (PK)
- `clerk_org_id` text (unique)
- `name` text
- `created_at`, `updated_at`

### `api_keys`

Store **hash only**.

- `id` uuid (PK)
- `tenant_id` uuid (FK tenants)
- `name` text
- `prefix` text (first 10–12 chars of key)
- `hash` text (HMAC hash or Argon2id/bcrypt output)
- `scopes` text[] (or jsonb)
- `revoked_at` timestamptz null
- `last_used_at` timestamptz null
- `created_at`

### `jobs`

Light wrapper around workflow runs.

- `id` uuid (PK)
- `tenant_id` uuid
- `workflow_run_id` text (unique)
- `type` text
- `status_cache` text: `queued|running|succeeded|failed|canceled`
- `created_by_key_id` uuid null
- `idempotency_key` text null (unique per tenant)
- `input` jsonb null (optional; can store hash instead)
- `result` jsonb null (store small results only)
- `error` jsonb null
- `created_at`, `updated_at`, `completed_at`

---

## API key rules (safe storage)

### Key format

- Display once: `sk_live_<random>`
- Store:
  - `prefix = key.slice(0, 12)`
  - `hash = HMAC_SHA256(SERVER_SECRET, key)` **or** Argon2id/bcrypt

Never store raw keys. Never show again after creation.

### Pseudocode: create key

```tsx
raw = "sk_live_" + random()
prefix = raw.slice(0, 12)
hash = HMAC(serverSecret, raw)

insert api_keys { tenant_id, name, prefix, hash, scopes }
return raw // once

```

### Pseudocode: verify key

```tsx
raw = bearerToken()
prefix = raw.slice(0, 12)
hash = HMAC(serverSecret, raw)

row = select * from api_keys
      where prefix=prefix and hash=hash and revoked_at is null
if !row -> 401

```

---

## Principal resolution (auth middleware)

Resolution order:

1. If request has `Authorization: Bearer sk_*` → **api_key principal**
2. Else try Clerk session → **user principal**
3. Else → anon

**Rule:** if API key is present and valid, do not require Clerk.

### Pseudocode: resolve principal

```tsx
function resolvePrincipal(req):
  bearer = req.authBearer()

  if bearer startsWith "sk_":
    key = verifyApiKey(bearer)
    if !key: return null
    return { kind:"api_key", tenantId:key.tenant_id, keyId:key.id, scopes:key.scopes }

  user = verifyClerk(req)
  if !user or !user.activeOrg: return null
  tenantId = lookupTenantId(user.orgId)
  return { kind:"user", tenantId, userId:user.id, scopes:scopesForRole(user.orgRole) }

```

---

## Per-route policy checks (permissions)

Each route declares:

- allowed principal kinds
- required scopes

### Pseudocode: policy guard

```tsx
function require(principal, allowKinds, scopes=[]):
  kind = principal?.kind ?? "anon"
  if kind not in allowKinds: throw 401
  for s in scopes:
    if s not in principal.scopes: throw 403

```

---

# Phase 0 — baseline deploy ✅

**Build**

- [x] Next 16 app
- [x] Elysia under `/api/*`
- [x] `GET /api/public/health`
- [x] Swagger docs at `/api/swagger`

**Done**

- [x] Health endpoint responds
- [ ] Deploy to Vercel

---

# Phase 1 — Clerk Org dashboard auth

**Build**

- Clerk auth for `/dashboard/*`
- On Org access, upsert `tenants` row

**Endpoints**

- `GET /api/dashboard/me` (user-only)

**Done**

- dashboard loads, tenant exists

---

# Phase 2 — API key provisioning (dashboard)

**Build**

- Create/list/revoke keys (user-only)
- Store hash + prefix only

**Endpoints**

- `POST /api/dashboard/keys` → returns raw key once
- `GET /api/dashboard/keys` → list (no raw)
- `POST /api/dashboard/keys/:id/revoke`

**Done**

- can create/revoke keys per Org

---

# Phase 3 — Integration auth + “whoami”

**Build**

- Elysia middleware: `resolvePrincipal()`
- Basic scopes

**Endpoints**

- `GET /api/v1/whoami` (api_key-only)

**Done**

- valid key returns tenant id + scopes

---

# Phase 4 — Jobs API (start + poll)

**Build**

- `jobs` table
- idempotency (optional but recommended)

**Endpoints**

- `POST /api/v1/jobs` (api_key-only, scope `jobs:create`)
- `GET /api/v1/jobs/:id` (api_key-only, scope `jobs:read`)
- `GET /api/v1/jobs/:id/result` (api_key-only, scope `jobs:read`)

**Start job flow**

- insert `jobs` row → `queued`
- start workflow → get `workflow_run_id`
- update row with `workflow_run_id`

**Done**

- client can start job and poll status

---

# Phase 5 — Workflow runner (long tasks)

**Build**

- Vercel Workflow per job type
- Steps update `jobs.status_cache` + `jobs.result/error`
- Claude Agent SDK runs inside Vercel Sandbox step

**Workflow skeleton**

- step: mark running
- step: run agent in sandbox
- step: save result
- step: mark done
- catch: save error + mark failed

**Done**

- jobs complete reliably without long HTTP requests

---

# Phase 6 — Dashboard jobs UI

**Build**

- list jobs by tenant
- job detail view

**Endpoints**

- `GET /api/dashboard/jobs` (user-only)
- `GET /api/dashboard/jobs/:id` (user-only)

**Done**

- internal debugging is easy

---

# Phase 7 — Hardening

**Build**

- rate limit by key
- concurrency limits by tenant
- idempotency required for clients that retry
- audit log for key + job actions

**Done**

- retries don’t duplicate work
- one tenant can’t overload system

---

# Phase 8 — Webhooks (later, last phase)

**Not now.**

When you add it:

- tenant webhook config + secret
- signed payload
- retry + delivery log

---

---

---

## Minimal scopes (starter)

API keys:

- `jobs:create`
- `jobs:read`
- `jobs:cancel` (later)

Clerk roles → scopes:

- Org admin: all dashboard scopes
- Member: read-only dashboard scopes (optional)

---

## Rabbit-holes

## No-gos

- Features

## Resources

https://stripe.com/blog/three-ways-our-usage-based-billing-product-is-unique

[How Lance from LangChain sets up self-learn for his Claude Code](https://www.notion.so/How-Lance-from-LangChain-sets-up-self-learn-for-his-Claude-Code-2deffe5c4f74804692cdf48b9b5e4a71?pvs=21)

## Notes

## Notes on Next 16 `proxy.ts`

Use `proxy.ts` for routing/edge-ish decisions only.

Do auth + permissions in API handlers (Elysia routes).

**Use DB for:**

- tenant ownership (auth)
- list/search jobs
- cached status
- saved results + errors

**Use workflow for:**

- actual execution
- durable step orchestration
- long waits

<aside>
💡

all our apps and interfaces should have a unified design language

</aside>

- Design inspo: https://agentfund.com/ (very minimal)
- https://juicebox.ai/?utm_source=linkedin
- https://www.daytona.io/
- https://www.intercom.studio/

## Project tasks

[Tasks](https://www.notion.so/2dbffe5c4f748184a7d2fe6f69d0ae0c?pvs=21)
