import type { Metadata } from "next"
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemedClerkProvider } from "@/components/clerk-provider"
import { PostHogProvider } from "@/components/posthog-provider"
import { SearchCommand } from "@/components/search-command"
import { DevTool } from "@/components/dev-tool/dev-tool"
import "./globals.css"

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-sans",
})

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Oatmeal",
  description: "Hackathon platform",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={jetbrainsMono.variable} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ThemedClerkProvider>
            <PostHogProvider>{children}</PostHogProvider>
            <SearchCommand />
            {(process.env.NODE_ENV === "development" || process.env.ADMIN_ENABLED === "true") && <DevTool />}
          </ThemedClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
