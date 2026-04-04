import { SCENARIO_NAMES } from "@/lib/dev/scenarios"

const arg = process.argv[2]

if (!arg) {
  console.log("Usage: bun run scripts/test-scenario.ts <scenario-name>\n")
  console.log("Available scenarios:")
  for (const s of SCENARIO_NAMES) {
    console.log(`  - ${s}`)
  }
  process.exit(0)
}

if (!SCENARIO_NAMES.includes(arg)) {
  console.error(`Unknown scenario: "${arg}"\n`)
  console.log("Available scenarios:")
  for (const s of SCENARIO_NAMES) {
    console.log(`  - ${s}`)
  }
  process.exit(1)
}

await import(`./test-scenarios/${arg}.ts`)
