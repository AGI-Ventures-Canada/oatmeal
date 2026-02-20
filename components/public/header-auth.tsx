"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser } from "@clerk/nextjs"

export function HeaderAuth() {
  const pathname = usePathname()
  const { isSignedIn, user } = useUser()

  if (isSignedIn) {
    return (
      <Link
        href="/home"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        {user?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.imageUrl}
            alt={user.fullName || "User"}
            className="size-6 rounded-full"
          />
        ) : (
          <div className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            {user?.firstName?.charAt(0) || "U"}
          </div>
        )}
        <span className="hidden sm:inline">Dashboard</span>
      </Link>
    )
  }

  return (
    <Link
      href={`/sign-in?redirect_url=${encodeURIComponent(pathname)}`}
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      Sign in
    </Link>
  )
}
