"use client"

import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function MobileHeader() {
  const { isSignedIn } = useUser()

  return (
    <header className="flex md:hidden items-center gap-3 border-b px-4 py-3">
      <SidebarTrigger />
      <Link href={isSignedIn ? "/home" : "/"} className="font-bold text-lg">
        Oatmeal
      </Link>
    </header>
  )
}
