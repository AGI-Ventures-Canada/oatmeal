/**
 * Setup script: looks up the 5 test Clerk accounts, renames them, and writes their IDs to .env.local.
 *
 * Run once per dev/staging environment:
 *   bun scripts/provision-test-users.ts
 *
 * The script is idempotent — safe to re-run. Accounts must already exist in Clerk.
 * It will find each account by new or legacy email, rename it in Clerk, and write:
 *
 *   TEST_USER_1_ID=user_xxx
 *   TEST_USER_2_ID=user_xxx
 *   TEST_USER_3_ID=user_xxx
 *   TEST_USER_4_ID=user_xxx
 *   TEST_USER_5_ID=user_xxx
 */

import { clerkClient } from "@clerk/nextjs/server"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { resolve } from "path"

const TEST_USERS = [
  { key: "user1", name: "Test User 1", email: "user1@test.oatmeal.dev", legacyEmail: "alice@test.oatmeal.dev", envVar: "TEST_USER_1_ID" },
  { key: "user2", name: "Test User 2", email: "user2@test.oatmeal.dev", legacyEmail: "bob@test.oatmeal.dev",   envVar: "TEST_USER_2_ID" },
  { key: "user3", name: "Test User 3", email: "user3@test.oatmeal.dev", legacyEmail: "carol@test.oatmeal.dev", envVar: "TEST_USER_3_ID" },
  { key: "user4", name: "Test User 4", email: "user4@test.oatmeal.dev", legacyEmail: "dave@test.oatmeal.dev",  envVar: "TEST_USER_4_ID" },
  { key: "user5", name: "Test User 5", email: "user5@test.oatmeal.dev", legacyEmail: "eve@test.oatmeal.dev",   envVar: "TEST_USER_5_ID" },
]

if (!process.env.CLERK_SECRET_KEY) {
  console.error("Missing CLERK_SECRET_KEY — make sure .env.local is loaded.")
  process.exit(1)
}

const clerk = await clerkClient()
const results: { envVar: string; id: string }[] = []

for (const u of TEST_USERS) {
  let found = await clerk.users.getUserList({ emailAddress: [u.email] })

  if (found.data.length === 0) {
    found = await clerk.users.getUserList({ emailAddress: [u.legacyEmail] })
  }

  if (found.data.length === 0) {
    console.error(`  missing  ${u.key} — no account found at ${u.email} or ${u.legacyEmail}`)
    process.exit(1)
  }

  const user = found.data[0]
  const currentName = [user.firstName, user.lastName].filter(Boolean).join(" ")

  if (currentName !== u.name) {
    await clerk.users.updateUser(user.id, { firstName: u.name, lastName: "" })
    console.log(`  renamed  ${currentName || "(no name)"} → ${u.name}`)
  }

  results.push({ envVar: u.envVar, id: user.id })
  console.log(`  found    ${u.key} → ${user.id}`)
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
