import { source } from "@/lib/docs-source"
import fs from "fs/promises"
import path from "path"

export const revalidate = false

async function getPageContent(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, "utf-8")
    return content
      .replace(/^---[\s\S]*?---\n*/m, "")
      .replace(/<Tabs[\s\S]*?<\/Tabs>/g, (match) => {
        const codeBlocks = match.match(/```[\s\S]*?```/g)
        return codeBlocks ? codeBlocks[0] : ""
      })
      .replace(/<Tab[^>]*>/g, "")
      .replace(/<\/Tab>/g, "")
      .replace(/<Callout[^>]*>/g, "> **Note:** ")
      .replace(/<\/Callout>/g, "")
      .trim()
  } catch {
    return ""
  }
}

export async function GET() {
  const pages = source.getPages()

  const sections = await Promise.all(
    pages.map(async (page) => {
      const filePath = path.join(process.cwd(), "content/docs", `${page.slugs.join("/") || "index"}.mdx`)
      const content = await getPageContent(filePath)

      return `# ${page.data.title}

URL: ${page.url}
${page.data.description ? `Description: ${page.data.description}` : ""}

${content}
`
    })
  )

  const fullContent = `# Agents Server SDK - Full Documentation

This file contains the complete documentation for AI/LLM consumption.
Generated at: ${new Date().toISOString()}

---

${sections.join("\n---\n\n")}
`

  return new Response(fullContent, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  })
}
