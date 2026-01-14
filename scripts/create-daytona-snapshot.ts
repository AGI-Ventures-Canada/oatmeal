#!/usr/bin/env bun
/**
 * Create Daytona Snapshot for Claude Agent SDK
 *
 * Creates a minimal snapshot with Node.js 20 for running the Claude Agent SDK.
 * Uses the smallest possible resources to minimize costs.
 *
 * Usage:
 *   DAYTONA_API_KEY=... bun scripts/create-daytona-snapshot.ts
 *   DAYTONA_API_KEY=... bun scripts/create-daytona-snapshot.ts --large  # For larger resources
 */

import { Daytona, Image } from "@daytonaio/sdk"

const USE_LARGE = process.argv.includes("--large")
const SNAPSHOT_NAME = USE_LARGE ? "claude-agent-sdk-large" : "claude-agent-sdk-tiny"

async function main() {
  const apiKey = process.env.DAYTONA_API_KEY
  const apiUrl = process.env.DAYTONA_API_URL

  if (!apiKey) {
    console.error("Error: DAYTONA_API_KEY is required")
    process.exit(1)
  }

  console.log("Connecting to Daytona...")
  const daytona = new Daytona({
    apiKey,
    apiUrl,
  })

  const resources = USE_LARGE
    ? { cpu: 2, memory: 4, disk: 10 }
    : { cpu: 1, memory: 1, disk: 1 }  // Absolute minimum

  console.log(`Creating snapshot: ${SNAPSHOT_NAME}`)
  console.log(`Resources: ${resources.cpu} CPU, ${resources.memory}GB RAM, ${resources.disk}GB disk`)
  console.log("This will include: Node.js 20, npm")

  try {
    // Check if snapshot already exists using daytona.snapshot.get()
    try {
      const existing = await daytona.snapshot.get(SNAPSHOT_NAME)
      if (existing) {
        console.log(`\nSnapshot already exists!`)
        console.log(`  Name: ${existing.name}`)
        console.log(`  State: ${existing.state}`)
        console.log(`\nAdd to .env.local:`)
        console.log(`  DAYTONA_BASE_SNAPSHOT_ID=${existing.name}`)
        return
      }
    } catch {
      // Snapshot doesn't exist, continue to create
    }

    // Create snapshot from Node.js 20 image using Image.base() helper
    console.log("\nCreating snapshot (this may take a few minutes)...")
    const nodeImage = Image.base("node:20-slim")

    const snapshot = await daytona.snapshot.create(
      {
        name: SNAPSHOT_NAME,
        image: nodeImage,
        resources,
        entrypoint: ["sleep", "infinity"],
      },
      { onLogs: (log: string) => console.log(`  [build] ${log}`) }
    )

    console.log(`\nSnapshot created!`)
    console.log(`  Name: ${snapshot.name}`)
    console.log(`  State: ${snapshot.state}`)

    console.log(`\nAdd to .env.local:`)
    console.log(`  DAYTONA_BASE_SNAPSHOT_ID=${snapshot.name}`)

    console.log(`\nNote: The snapshot uses node:20-slim base image.`)
    console.log(`@anthropic-ai/claude-agent-sdk will be installed at runtime.`)
  } catch (err) {
    console.error("Failed to create snapshot:", err)
    process.exit(1)
  }
}

main()
