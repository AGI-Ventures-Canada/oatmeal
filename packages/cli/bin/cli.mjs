#!/usr/bin/env node

// Enable compile cache for faster subsequent runs (Node.js 22+)
if (process.features?.module_compile_cache) {
  try {
    const { enableCompileCache } = await import("node:module")
    enableCompileCache?.()
  } catch {}
}

import("../dist/cli.mjs")
