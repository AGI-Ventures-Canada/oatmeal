"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"

type Status = "loading" | "success" | "error"

export function CliAuthClient({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>("loading")
  const [error, setError] = useState<string>()

  useEffect(() => {
    async function completeAuth() {
      try {
        const hostname = typeof window !== "undefined" ? window.location.hostname : "unknown"
        const res = await fetch("/api/dashboard/cli-auth/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceToken: token, hostname }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError(data.error ?? "Failed to authorize CLI")
          setStatus("error")
          return
        }

        setStatus("success")
      } catch {
        setError("Network error. Please try again.")
        setStatus("error")
      }
    }

    completeAuth()
  }, [token])

  if (status === "loading") {
    return (
      <div className="text-center max-w-md">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-2xl font-bold mb-2">Authorizing CLI...</h1>
        <p className="text-muted-foreground">
          Creating an API key for your terminal session.
        </p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="text-center max-w-md">
        <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <h1 className="text-2xl font-bold mb-2">Authorization Failed</h1>
        <p className="text-muted-foreground mb-4">
          {error ?? "Something went wrong. Please try again."}
        </p>
        <p className="text-sm text-muted-foreground">
          Run <code className="bg-muted px-1.5 py-0.5 rounded">oatmeal login</code>{" "}
          again from your terminal.
        </p>
      </div>
    )
  }

  return (
    <div className="text-center max-w-md">
      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-primary" />
      <h1 className="text-2xl font-bold mb-2">CLI Authorized!</h1>
      <p className="text-muted-foreground mb-6">
        You can close this tab and return to your terminal. The CLI will
        automatically detect the authentication.
      </p>
      <Button variant="outline" onClick={() => window.close()}>
        Close Tab
      </Button>
    </div>
  )
}
