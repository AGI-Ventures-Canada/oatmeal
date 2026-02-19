const scenarios = [
  "pre-registration",
  "registered-no-team",
  "team-formed",
  "submitted",
  "judging",
  "judging-in-progress",
  "results-ready",
]

const arg = process.argv[2]

if (!arg) {
  console.log("Usage: bun run scripts/test-scenario.ts <scenario-name>\n")
  console.log("Available scenarios:")
  for (const s of scenarios) {
    console.log(`  - ${s}`)
  }
  process.exit(0)
}

if (!scenarios.includes(arg)) {
  console.error(`Unknown scenario: "${arg}"\n`)
  console.log("Available scenarios:")
  for (const s of scenarios) {
    console.log(`  - ${s}`)
  }
  process.exit(1)
}

await import(`./test-scenarios/${arg}.ts`)
