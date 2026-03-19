import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { CONFIG_DIR, VERSION } from "./constants.js"
import { formatUpdateHint } from "./invocation.js"

const PACKAGE_NAME = "@agi-ventures-canada/hackathon-cli"
const CHECK_FILE = join(CONFIG_DIR, "update-check.json")
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000 // 4 hours

interface UpdateCheckCache {
  lastChecked: number
  latestVersion: string
}

function readCache(): UpdateCheckCache | null {
  if (!existsSync(CHECK_FILE)) return null
  try {
    return JSON.parse(readFileSync(CHECK_FILE, "utf-8")) as UpdateCheckCache
  } catch {
    return null
  }
}

function writeCache(data: UpdateCheckCache): void {
  try {
    writeFileSync(CHECK_FILE, JSON.stringify(data) + "\n", { mode: 0o600 })
  } catch {
    // Silently ignore write failures
  }
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(
      `https://registry.npmjs.org/${PACKAGE_NAME}/latest`,
      { signal: controller.signal }
    )
    clearTimeout(timeout)
    if (!res.ok) return null
    const data = (await res.json()) as { version?: string }
    return data.version ?? null
  } catch {
    return null
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number)
  const pb = b.split(".").map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1
  }
  return 0
}

export interface UpdateInfo {
  current: string
  latest: string
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const cache = readCache()
  const now = Date.now()

  if (cache && now - cache.lastChecked < CHECK_INTERVAL_MS) {
    if (compareVersions(VERSION, cache.latestVersion) < 0) {
      return { current: VERSION, latest: cache.latestVersion }
    }
    return null
  }

  const latest = await fetchLatestVersion()
  if (!latest) return null

  writeCache({ lastChecked: now, latestVersion: latest })

  if (compareVersions(VERSION, latest) < 0) {
    return { current: VERSION, latest }
  }
  return null
}

export function formatUpdateNotice(info: UpdateInfo): string {
  return `\nUpdate available: ${info.current} → ${info.latest}\n${formatUpdateHint()}`
}
