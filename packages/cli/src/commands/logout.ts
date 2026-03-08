import * as p from "@clack/prompts"
import { clearConfig, loadConfig } from "../config.js"

export async function runLogout(): Promise<void> {
  const config = loadConfig()
  if (!config) {
    p.log.info("Not logged in.")
    return
  }

  clearConfig()
  p.log.success("Logged out. Config removed.")
}
