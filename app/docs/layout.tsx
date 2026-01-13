import { DocsLayout } from "fumadocs-ui/layouts/docs"
import type { ReactNode } from "react"
import { source } from "@/lib/docs-source"
import { RootProvider } from "fumadocs-ui/provider/next"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <RootProvider>
      <DocsLayout
        tree={source.pageTree}
        nav={{
          title: "Agents Server SDK",
        }}
        links={[
          {
            text: "Dashboard",
            url: "/agents",
          },
        ]}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  )
}
