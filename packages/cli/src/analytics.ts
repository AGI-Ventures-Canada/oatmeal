import { randomUUID } from "node:crypto"
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { CONFIG_DIR } from "./constants.js"
import { join } from "node:path"

const POSTHOG_KEY = process.env.HACKATHON_POSTHOG_KEY
const POSTHOG_HOST = process.env.HACKATHON_POSTHOG_HOST || "https://us.i.posthog.com"
const ANONYMOUS_ID_FILE = join(CONFIG_DIR, "anonymous_id")

function getAnonymousId(): string {
  try {
    if (existsSync(ANONYMOUS_ID_FILE)) {
      return readFileSync(ANONYMOUS_ID_FILE, "utf-8").trim()
    }
  } catch {}

  const id = randomUUID()
  try {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
    }
    writeFileSync(ANONYMOUS_ID_FILE, id, { mode: 0o600 })
  } catch {}
  return id
}

export function trackCliEvent(
  event: string,
  properties?: Record<string, unknown>
) {
  if (!POSTHOG_KEY) return

  const body = JSON.stringify({
    api_key: POSTHOG_KEY,
    event,
    properties: {
      distinct_id: getAnonymousId(),
      source: "cli",
      ...properties,
    },
    timestamp: new Date().toISOString(),
  })

  fetch(`${POSTHOG_HOST}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {})
}
