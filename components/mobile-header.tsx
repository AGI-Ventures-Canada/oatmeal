"use client"

import Link from "next/link"
import Image from "next/image"
import { useUser, useClerk } from "@clerk/nextjs"
import { useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Menu, UserCog, LogOut } from "lucide-react"

export function MobileHeader() {
  const { isSignedIn, user } = useUser()
  const { openUserProfile, signOut } = useClerk()
  const { toggleSidebar } = useSidebar()

  return (
    <header className="flex md:hidden items-center gap-3 border-b px-4 py-3">
      <Button variant="ghost" size="icon-sm" onClick={toggleSidebar}>
        <Menu className="size-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>
      <Link href={isSignedIn ? "/home" : "/"} className="font-bold text-lg">
        Oatmeal
      </Link>
      {isSignedIn && user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="ml-auto rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {user.imageUrl ? (
                <Image
                  src={user.imageUrl}
                  alt={user.fullName || "User"}
                  width={28}
                  height={28}
                  className="size-7 rounded-full"
                />
              ) : (
                <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {user.firstName?.charAt(0) || user.emailAddresses[0]?.emailAddress?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openUserProfile()}>
              <UserCog className="size-4 mr-2" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ redirectUrl: "/sign-in" })}>
              <LogOut className="size-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  )
}
