import { execSync } from "node:child_process"
import pc from "picocolors"
import { VERSION } from "../constants.js"
import { checkForUpdate } from "../update-check.js"

export async function runUpdate(): Promise<void> {
  console.log(`Current version: ${VERSION}`)
  console.log("Checking for updates...")

  const update = await checkForUpdate()
  if (!update) {
    console.log(pc.green("Already up to date."))
    return
  }

  console.log(`New version available: ${update.latest}`)
  console.log("Updating...")

  try {
    execSync("npm install -g @agi-ventures-canada/hackathon-cli@latest", {
      stdio: "inherit",
    })
    console.log(pc.green(`\nUpdated to ${update.latest}`))
  } catch {
    console.error(pc.red("Update failed. Try manually:"))
    console.error("  npm install -g @agi-ventures-canada/hackathon-cli@latest")
    process.exit(1)
  }
}
