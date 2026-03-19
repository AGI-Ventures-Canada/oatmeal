import { execSync } from "node:child_process"
import pc from "picocolors"
import { VERSION } from "../constants.js"
import { detectInvocationMode } from "../invocation.js"
import { checkForUpdate } from "../update-check.js"

const PKG = "@agi-ventures-canada/hackathon-cli"

function detectPackageManager(): { cmd: string; install: string } {
  const execPath = process.env.npm_execpath ?? process.env._ ?? ""
  if (/bun/.test(execPath)) return { cmd: "bun", install: `bun install -g ${PKG}@latest` }
  if (/pnpm/.test(execPath)) return { cmd: "pnpm", install: `pnpm add -g ${PKG}@latest` }
  if (/yarn/.test(execPath)) return { cmd: "yarn", install: `yarn global add ${PKG}@latest` }
  return { cmd: "npm", install: `npm install -g ${PKG}@latest` }
}

export async function runUpdate(): Promise<void> {
  console.log(`Current version: ${VERSION}`)
  console.log("Checking for updates...")

  const update = await checkForUpdate()
  if (!update) {
    console.log(pc.green("Already up to date."))
    return
  }

  const pm = detectPackageManager()
  const invocationMode = detectInvocationMode()
  console.log(`New version available: ${update.latest}`)

  if (invocationMode === "local-bun-script") {
    console.log(pc.yellow("You are running the repo-local CLI via `bun cli`."))
    console.log("Update this repository to use the newer CLI source, or install the published package globally:")
    console.log(`  ${pm.install}`)
    return
  }

  console.log(`Updating via ${pm.cmd}...`)

  try {
    execSync(pm.install, { stdio: "inherit" })
    console.log(pc.green(`\nUpdated to ${update.latest}`))
  } catch {
    console.error(pc.red("Update failed. Try manually:"))
    console.error(`  ${pm.install}`)
    process.exit(1)
  }
}
