"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useSearchParams } from "next/navigation"
import { useUser, useClerk } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Menu, Home, Search, Settings, X } from "lucide-react"

const navItems = [
  { title: "Dashboard", href: "/home", icon: Home },
  { title: "Browse", href: "/browse", icon: Search },
  { title: "Settings", href: "/settings", icon: Settings },
]

export function MobileHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isSignedIn, user } = useUser()
  const { openUserProfile } = useClerk()

  useEffect(() => {
    setOpen(false)
  }, [pathname, searchParams])

  return (
    <>
      <header className="flex lg:hidden items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)}>
          <Menu className="size-5" />
          <span className="sr-only">Open menu</span>
        </Button>
        <Link href={isSignedIn ? "/home" : "/"} className="font-bold text-lg">
          Oatmeal
        </Link>
        {isSignedIn && user && (
          <button
            type="button"
            className="ml-auto rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => openUserProfile()}
          >
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
        )}
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-full max-w-full p-0 flex flex-col border-none"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Mobile navigation menu</SheetDescription>
          </SheetHeader>

          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)}>
              <X className="size-5" />
              <span className="sr-only">Close menu</span>
            </Button>
            <span className="font-bold text-lg">Oatmeal</span>
          </div>

          <nav className="flex-1 px-4 py-6">
            {navItems.map((item) => {
              const active = pathname.startsWith(
                new URL(item.href, "http://x").pathname
              )
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-4 px-2 py-4 text-base border-b border-border transition-colors ${
                    active
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="size-5" />
                  {item.title}
                </Link>
              )
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
