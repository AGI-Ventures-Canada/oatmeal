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
  async rewrites() {
    return [
      {
        source: "/docs/:path*.mdx",
        destination: "/llms.mdx/docs/:path*",
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
}

const withMDX = createMDX()

export default withWorkflow(withMDX(nextConfig))
