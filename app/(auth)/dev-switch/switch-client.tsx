"use client"

import { useEffect, useState } from "react"
import { useSignIn, useClerk } from "@clerk/nextjs"
import { Loader2 } from "lucide-react"
import Link from "next/link"

export function DevSwitchClient({
  token,
  redirect,
}: {
  token: string
  redirect: string
}) {
  const { signIn, isLoaded, setActive } = useSignIn()
  const { signOut } = useClerk()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded || !signIn) return

    async function doSwitch() {
      try {
        await signOut()

        const result = await signIn!.create({
          strategy: "ticket",
          ticket: token,
        })

        if (result.status === "complete") {
          await setActive!({ session: result.createdSessionId })
          window.location.replace(redirect)
        } else {
          setError(`Unexpected sign-in status: ${result.status}`)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Sign-in failed"
        setError(msg)
      }
    }

    doSwitch()
  }, [isLoaded, signIn, signOut, token, redirect, setActive])

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-4">
        <p className="text-sm text-destructive">{error}</p>
        <Link href="/sign-in" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-4">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Switching account…</p>
    </div>
  )
}
