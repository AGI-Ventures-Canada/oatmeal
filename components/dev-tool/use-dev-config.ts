"use client"

import { useState, useCallback } from "react"

const STORAGE_KEY = "devtools-config"

export type DevConfig = {
  orgId: string
  devUserId: string
  testUsers: Record<string, string>
}

const EMPTY_CONFIG: DevConfig = { orgId: "", devUserId: "", testUsers: {} }

function readStorage(): DevConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_CONFIG
    return { ...EMPTY_CONFIG, ...JSON.parse(raw) }
  } catch {
    return EMPTY_CONFIG
  }
}

function writeStorage(config: DevConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // private browsing or quota exceeded — silently ignore
  }
}

export function useDevConfig() {
  const [config, setConfig] = useState<DevConfig>(() => readStorage())

  const updateConfig = useCallback((patch: Partial<DevConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch }
      writeStorage(next)
      return next
    })
  }, [])

  const clearConfig = useCallback(() => {
    setConfig(EMPTY_CONFIG)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  return { config, updateConfig, clearConfig }
}
