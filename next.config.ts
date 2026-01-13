import type { NextConfig } from "next"
import { withWorkflow } from "workflow/next"
import { createMDX } from "fumadocs-mdx/next"

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "workflow",
    "@workflow/ai",
    "@daytonaio/sdk",
    "ai",
    "zod",
  ],
}

const withMDX = createMDX()

export default withMDX(withWorkflow(nextConfig))
