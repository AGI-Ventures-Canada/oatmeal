import type { NextConfig } from "next"
import { withWorkflow } from "workflow/next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["workflow", "@workflow/ai"],
}

export default withWorkflow(nextConfig)
