import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"
import { CONFIG_DIR, CONFIG_FILE, DEFAULT_BASE_URL } from "./constants.js"
import { ConfigError } from "./errors.js"
import type { CliConfig } from "./types.js"

export function loadConfig(): CliConfig | null {
  const envKey = process.env.HACKATHON_API_KEY
  const envUrl = process.env.HACKATHON_BASE_URL

  if (envKey) {
    return {
      apiKey: envKey,
      baseUrl: envUrl ?? DEFAULT_BASE_URL,
    }
  }

  if (!existsSync(CONFIG_FILE)) {
    return null
  }

  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8")
    const parsed = JSON.parse(raw) as CliConfig
    return {
      ...parsed,
      apiKey: envKey ?? parsed.apiKey,
      baseUrl: envUrl ?? parsed.baseUrl,
    }
  } catch {
    throw new ConfigError(
      `Invalid config file at ${CONFIG_FILE}. Delete it and run "hackathon login" again.`
    )
  }
}

export function saveConfig(config: CliConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 })
  }

  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n", {
    mode: 0o600,
  })
}

export function clearConfig(): void {
  if (existsSync(CONFIG_FILE)) {
    unlinkSync(CONFIG_FILE)
  }
}
