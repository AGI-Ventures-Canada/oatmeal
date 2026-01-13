import { source } from "@/lib/docs-source"

const baseUrl = process.env.NEXT_PUBLIC_URL || "https://agents-server.com"

export const revalidate = false

export function GET() {
  const pages = source.getPages()

  const content = `# Agents Server SDK Documentation

> This file contains links to all documentation pages for AI/LLM consumption.
> For full content, see /llms-full.txt

## Pages

${pages.map((page) => `- [${page.data.title}](${baseUrl}${page.url}): ${page.data.description || ""}`).join("\n")}

## Quick Reference

- Base URL: ${baseUrl}/docs
- Full docs (single file): ${baseUrl}/llms-full.txt
- Individual pages: Append .mdx to any docs URL

## SDK Installation

\`\`\`bash
npm install @agents-server/sdk
\`\`\`

## Authentication

All API endpoints require Bearer token authentication:
\`\`\`
Authorization: Bearer sk_live_your_api_key
\`\`\`
`

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  })
}
