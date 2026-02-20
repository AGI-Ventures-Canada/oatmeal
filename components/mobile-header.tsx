"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useSearchParams } from "next/navigation"
import { useUser, useClerk } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Menu, X, ChevronRight, ChevronLeft } from "lucide-react"

type NavSection = {
  title: string
  href?: string
  children?: { title: string; href: string }[]
}

const navSections: NavSection[] = [
  { title: "Dashboard", href: "/home" },
  { title: "Browse", href: "/browse" },
  {
    title: "Hackathons",
    children: [
      { title: "Participating", href: "/home?tab=participating" },
      { title: "Judging", href: "/home?tab=judging" },
      { title: "Organizing", href: "/home?tab=organized" },
      { title: "Sponsoring", href: "/home?tab=sponsored" },
    ],
  },
  {
    title: "Settings",
    children: [
      { title: "Organization", href: "/settings/profile" },
      { title: "API Keys", href: "/settings/api-keys" },
      { title: "Schedules", href: "/settings/schedules" },
      { title: "Webhooks", href: "/settings/webhooks" },
      { title: "Integrations", href: "/settings/integrations" },
    ],
  },
]

export function MobileHeader() {
  const [open, setOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<NavSection | null>(null)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isSignedIn, user } = useUser()
  const { openUserProfile, signOut } = useClerk()

  const close = useCallback(() => {
    setOpen(false)
    setActiveSection(null)
  }, [])

  useEffect(() => {
    close()
  }, [pathname, searchParams, close])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

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

      {/* Full-screen menu overlay */}
      <div
        className={`fixed inset-0 z-50 bg-background flex flex-col transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Menu header */}
        <div className="flex items-center justify-between px-5 py-4">
          <span className="font-bold text-lg">Oatmeal</span>
          <Button variant="ghost" size="icon-sm" onClick={close}>
            <X className="size-5" />
            <span className="sr-only">Close menu</span>
          </Button>
        </div>

        {/* Navigation panels */}
        <div className="relative flex-1 overflow-hidden">
          {/* Root level */}
          <nav
            className={`absolute inset-0 flex flex-col px-5 pt-4 transition-transform duration-250 ease-in-out ${
              activeSection ? "-translate-x-full" : "translate-x-0"
            }`}
          >
            {navSections.map((section) =>
              section.children ? (
                <button
                  key={section.title}
                  type="button"
                  onClick={() => setActiveSection(section)}
                  className="flex items-center justify-between py-5 text-xl text-muted-foreground active:text-foreground transition-colors"
                >
                  {section.title}
                  <ChevronRight className="size-5" />
                </button>
              ) : (
                <Link
                  key={section.title}
                  href={section.href!}
                  className="py-5 text-xl text-muted-foreground active:text-foreground transition-colors"
                >
                  {section.title}
                </Link>
              )
            )}
          </nav>

          {/* Sub-level */}
          <nav
            className={`absolute inset-0 flex flex-col px-5 transition-transform duration-250 ease-in-out ${
              activeSection ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveSection(null)}
              className="flex items-center gap-2 py-4 text-sm text-muted-foreground"
            >
              <ChevronLeft className="size-4" />
              {activeSection?.title}
            </button>
            {activeSection?.children?.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className="py-5 text-xl text-muted-foreground active:text-foreground transition-colors"
              >
                {child.title}
              </Link>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-4">
          {isSignedIn ? (
            <Button
              variant="secondary"
              className="w-full h-12 text-base"
              onClick={() => {
                close()
                signOut({ redirectUrl: "/sign-in" })
              }}
            >
              Sign out
            </Button>
          ) : (
            <Button variant="secondary" className="w-full h-12 text-base" asChild>
              <Link href={`/sign-in?redirect_url=${encodeURIComponent(pathname)}`}>
                Sign in
              </Link>
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
