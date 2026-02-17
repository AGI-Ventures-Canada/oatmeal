import { getOrCreateTenant, createTestHackathon, registerParticipant, DEV_USER_ID, printReady } from "./_helpers"

const SLUG = "test-registered-no-team"

async function run() {
  console.log("Setting up registered-no-team scenario...")

  const tenantId = await getOrCreateTenant()

  const now = new Date()
  const hackathonId = await createTestHackathon({
    tenantId,
    slug: SLUG,
    name: "Registered No Team Test",
    status: "registration_open",
    startsAt: new Date(now.getTime() + 3 * 86400000),
    endsAt: new Date(now.getTime() + 5 * 86400000),
  })

  await registerParticipant(hackathonId, DEV_USER_ID)

  console.log("Dev user registered as participant (no team).")
  printReady(SLUG)
}

run().catch(console.error)
