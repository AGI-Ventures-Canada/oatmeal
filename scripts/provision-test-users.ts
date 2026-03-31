/**
 * One-time setup script: creates the 5 test Clerk accounts used in scenario testing.
 *
 * Run once per dev/staging environment:
 *   bun run scripts/provision-test-users.ts
 *
 * The script is idempotent — it skips accounts that already exist.
 * After running, copy the printed env vars into your .env.local:
 *
 *   TEST_USER_ALICE_ID=user_xxx
 *   TEST_USER_BOB_ID=user_xxx
 *   TEST_USER_CAROL_ID=user_xxx
 *   TEST_USER_DAVE_ID=user_xxx
 *   TEST_USER_EVE_ID=user_xxx
 *
 * These accounts will be used as real Clerk users in scenario seeds, enabling
 * one-click sign-in as organizer, judge, or participant during manual testing.
 *
 * --- Why a script instead of auto-provisioning? ---
 * Clerk accounts are persistent across DB resets. Creating them on every scenario
 * run would accumulate duplicate users or fail with "already exists" errors.
 * Running once and storing the IDs in .env.local is explicit, predictable, and
 * survives `bun db:sync` without any cleanup needed. New teammates run this script
 * once and they're set up. Staging CI can run it in a setup job.
 */

import { clerkClient } from "@clerk/nextjs/server"

const TEST_USERS = [
  { key: "alice", firstName: "Alice", lastName: "Test", email: "alice@test.oatmeal.dev" },
  { key: "bob",   firstName: "Bob",   lastName: "Test", email: "bob@test.oatmeal.dev" },
  { key: "carol", firstName: "Carol", lastName: "Test", email: "carol@test.oatmeal.dev" },
  { key: "dave",  firstName: "Dave",  lastName: "Test", email: "dave@test.oatmeal.dev" },
  { key: "eve",   firstName: "Eve",   lastName: "Test", email: "eve@test.oatmeal.dev" },
]

const PASSWORD = "OatmealTest1!"

if (!process.env.CLERK_SECRET_KEY) {
  console.error("Missing CLERK_SECRET_KEY — make sure .env.local is loaded.")
  process.exit(1)
}

const clerk = await clerkClient()
const results: { key: string; id: string; created: boolean }[] = []

for (const u of TEST_USERS) {
  const existing = await clerk.users.getUserList({ emailAddress: [u.email] })

  if (existing.data.length > 0) {
    const id = existing.data[0].id
    results.push({ key: u.key, id, created: false })
    console.log(`  skip  ${u.firstName} (already exists: ${id})`)
    continue
  }

  const user = await clerk.users.createUser({
    firstName: u.firstName,
    lastName: u.lastName,
    emailAddress: [u.email],
    password: PASSWORD,
  })

  results.push({ key: u.key, id: user.id, created: true })
  console.log(`  created  ${u.firstName} → ${user.id}`)
}

console.log("\nAdd to .env.local:\n")
for (const r of results) {
  console.log(`TEST_USER_${r.key.toUpperCase()}_ID=${r.id}`)
}
console.log()
