import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { CliAuthClient } from "@/components/cli-auth/cli-auth-client"
import { completeCliAuthSession } from "@/lib/services/cli-auth"
import { getOrCreateTenant, getOrCreatePersonalTenant } from "@/lib/services/tenants"
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

  const { userId, orgId } = await auth()

  if (!userId) {
    redirect(`/sign-in?redirect_url=/cli-auth?token=${encodeURIComponent(token)}`)
  }

  let tenant
  if (orgId) {
    tenant = await getOrCreateTenant(orgId)
  } else {
    tenant = await getOrCreatePersonalTenant(userId)
  }

  let result: { success: boolean; error?: string }
  if (!tenant) {
    result = { success: false, error: "Could not resolve your account. Please try again." }
  } else {
    try {
      result = await completeCliAuthSession(token, tenant.id, "cli-auth")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[cli-auth] Failed to complete session:", message)
      result = { success: false, error: message }
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
      <CliAuthClient result={result} />
    </div>
  )
}
