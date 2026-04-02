/**
 * Setup script: looks up the 5 test Clerk accounts and writes their IDs to .env.local.
 *
 * Run once per dev/staging environment:
 *   bun scripts/provision-test-users.ts
 *
 * The script is idempotent — safe to re-run. Accounts must already exist in Clerk.
 * After running, the following vars will be set in .env.local:
 *
 *   TEST_USER_ALICE_ID=user_xxx
 *   TEST_USER_BOB_ID=user_xxx
 *   TEST_USER_CAROL_ID=user_xxx
 *   TEST_USER_DAVE_ID=user_xxx
 *   TEST_USER_EVE_ID=user_xxx
 */

import { clerkClient } from "@clerk/nextjs/server"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { resolve } from "path"

const TEST_USERS = [
  { key: "alice", email: "alice@test.oatmeal.dev", envVar: "TEST_USER_ALICE_ID" },
  { key: "bob",   email: "bob@test.oatmeal.dev",   envVar: "TEST_USER_BOB_ID" },
  { key: "carol", email: "carol@test.oatmeal.dev", envVar: "TEST_USER_CAROL_ID" },
  { key: "dave",  email: "dave@test.oatmeal.dev",  envVar: "TEST_USER_DAVE_ID" },
  { key: "eve",   email: "eve@test.oatmeal.dev",   envVar: "TEST_USER_EVE_ID" },
]

if (!process.env.CLERK_SECRET_KEY) {
  console.error("Missing CLERK_SECRET_KEY — make sure .env.local is loaded.")
  process.exit(1)
}

const clerk = await clerkClient()
const results: { envVar: string; id: string }[] = []

for (const u of TEST_USERS) {
  const found = await clerk.users.getUserList({ emailAddress: [u.email] })

  if (found.data.length === 0) {
    console.error(`  missing  ${u.key} (${u.email}) — account not found in Clerk`)
    process.exit(1)
  }

  const id = found.data[0].id
  results.push({ envVar: u.envVar, id })
  console.log(`  found    ${u.key} → ${id}`)
}

const envPath = resolve(process.cwd(), ".env.local")
const existing = existsSync(envPath) ? readFileSync(envPath, "utf8") : ""
const lines = existing.split("\n")

for (const { envVar, id } of results) {
  const idx = lines.findIndex((l) => l.startsWith(`${envVar}=`))
  const line = `${envVar}=${id}`
  if (idx >= 0) {
    lines[idx] = line
  } else {
    lines.push(line)
  }
}

writeFileSync(envPath, lines.join("\n"))
console.log(`\n✓ Wrote ${results.length} env vars to .env.local`)
