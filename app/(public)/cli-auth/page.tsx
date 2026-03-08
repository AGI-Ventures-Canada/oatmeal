import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { CliAuthClient } from "@/components/cli-auth/cli-auth-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "CLI Authentication | Oatmeal",
  description: "Authorize the Oatmeal CLI to access your account.",
}

type PageProps = {
  searchParams: Promise<{ token?: string }>
}

export default async function CliAuthPage({ searchParams }: PageProps) {
  const { token } = await searchParams

  if (!token || token.length < 32) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
          <p className="text-muted-foreground">
            This CLI authentication link is invalid or has expired. Please run{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm">oatmeal login</code>{" "}
            again from your terminal.
          </p>
        </div>
      </div>
    )
  }

  const { userId } = await auth()

  if (!userId) {
    redirect(`/sign-in?redirect_url=/cli-auth?token=${encodeURIComponent(token)}`)
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
      <CliAuthClient token={token} />
    </div>
  )
}
