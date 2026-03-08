import { homedir } from "node:os"
import { join } from "node:path"

export const VERSION = "0.1.0"
export const DEFAULT_BASE_URL = "https://oatmeal.app"
export const CONFIG_DIR = join(homedir(), ".oatmeal")
export const CONFIG_FILE = join(CONFIG_DIR, "config.json")
export const REQUEST_TIMEOUT_MS = 30_000
export const POLL_INTERVAL_MS = 2_000
export const AUTH_TIMEOUT_MS = 300_000
