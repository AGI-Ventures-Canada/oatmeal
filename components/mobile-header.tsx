"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import {
  useUser,
  useClerk,
  useOrganization,
  useOrganizationList,
} from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import {
  Menu,
  Home,
  Search,
  Users,
  Scale,
  Megaphone,
  Star,
  Settings,
  BookOpen,
  Building2,
  Key,
  Clock,
  Webhook,
  Plug,
  UserCog,
  LogOut,
  ChevronsUpDown,
  Globe,
  ExternalLink,
  Plus,
  ChevronLeft,
} from "lucide-react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { CreateOrganizationDialog } from "@/components/create-organization-dialog"

const mainItems = [
  { title: "Dashboard", href: "/home", icon: Home },
  { title: "Browse", href: "/browse", icon: Search },
]

const hackathonItems = [
  { title: "Participating", href: "/home?tab=participating", icon: Users },
  { title: "Judging", href: "/home?tab=judging", icon: Scale },
  { title: "Organizing", href: "/home?tab=organized", icon: Megaphone },
  { title: "Sponsoring", href: "/home?tab=sponsored", icon: Star },
]

const manageItems = [
  { title: "Settings", href: "/settings", icon: Settings },
  { title: "API Docs", href: "/docs", icon: BookOpen },
]

const settingsItems = [
  { title: "Organization", href: "/settings/profile", icon: Building2 },
  { title: "API Keys", href: "/settings/api-keys", icon: Key },
  { title: "Schedules", href: "/settings/schedules", icon: Clock },
  { title: "Webhooks", href: "/settings/webhooks", icon: Webhook },
  { title: "Integrations", href: "/settings/integrations", icon: Plug },
]

export function MobileHeader() {
  const [open, setOpen] = useState(false)
  const [createOrgOpen, setCreateOrgOpen] = useState(false)
  const [tenantSlug, setTenantSlug] = useState<string | null>(null)

  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isSignedIn, user } = useUser()
  const { openUserProfile, signOut } = useClerk()
  const { organization } = useOrganization()
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  })

  useEffect(() => {
    setOpen(false)
  }, [pathname, searchParams])

  useEffect(() => {
    if (!organization) {
      setTenantSlug(null)
      return
    }
    let cancelled = false
    fetch("/api/dashboard/org-profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setTenantSlug(data?.slug ?? null)
      })
      .catch(() => {
        if (!cancelled) setTenantSlug(null)
      })
    return () => { cancelled = true }
  }, [organization])

  const isSettingsView = pathname.startsWith("/settings")
  const currentTab = searchParams.get("tab")

  function isActive(item: { href: string }) {
    const url = new URL(item.href, "http://x")
    const tab = url.searchParams.get("tab")
    if (tab) return pathname === "/home" && currentTab === tab
    return pathname.startsWith(url.pathname)
  }

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
        <SheetContent side="left" className="w-[85%] max-w-xs p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>Mobile navigation menu</SheetDescription>
          </SheetHeader>

          {/* Org switcher */}
          <div className="p-4 pb-2">
            <button
              type="button"
              onClick={() => {
                const next = userMemberships?.data?.[0]
                if (!organization && next) {
                  setActive?.({ organization: next.organization.id })
                } else {
                  setActive?.({ organization: null })
                }
                router.push("/home")
              }}
              className="flex items-center gap-3 w-full text-left"
            >
              {organization?.imageUrl ? (
                <Image
                  src={organization.imageUrl}
                  alt={organization.name || "Organization"}
                  width={32}
                  height={32}
                  className="size-8 rounded object-cover"
                />
              ) : (
                <div className="flex size-8 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-semibold">
                  {organization?.name?.charAt(0).toUpperCase() || user?.firstName?.charAt(0)?.toUpperCase() || "P"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {organization?.name || "Personal Workspace"}
                </div>
              </div>
              <ChevronsUpDown className="size-4 text-muted-foreground shrink-0" />
            </button>

            {/* Org list (expandable in future, for now inline) */}
            <div className="mt-3 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setActive?.({ organization: null })
                  router.push("/home")
                }}
                className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <div className="flex size-5 items-center justify-center rounded bg-primary text-primary-foreground text-[10px] font-semibold">
                  {user?.firstName?.charAt(0)?.toUpperCase() || "P"}
                </div>
                <span className="truncate">Personal Workspace</span>
              </button>
              {userMemberships?.data?.map((mem) => (
                <button
                  key={mem.organization.id}
                  type="button"
                  onClick={() => {
                    setActive?.({ organization: mem.organization.id })
                    router.push("/home")
                  }}
                  className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  {mem.organization.imageUrl ? (
                    <Image
                      src={mem.organization.imageUrl}
                      alt={mem.organization.name}
                      width={20}
                      height={20}
                      className="size-5 rounded object-cover"
                    />
                  ) : (
                    <div className="flex size-5 items-center justify-center rounded bg-primary text-primary-foreground text-[10px] font-semibold">
                      {mem.organization.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="truncate">{mem.organization.name}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setCreateOrgOpen(true)
                }}
                className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent text-muted-foreground"
              >
                <div className="flex size-5 items-center justify-center rounded bg-muted">
                  <Plus className="size-3" />
                </div>
                <span>Create Organization</span>
              </button>
            </div>
          </div>

          <Separator />

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {isSettingsView ? (
              <>
                <div>
                  <Link
                    href="/home"
                    className="flex items-center gap-2 text-sm font-semibold mb-3"
                  >
                    <ChevronLeft className="size-4" />
                    Settings
                  </Link>
                  <div className="space-y-1">
                    {settingsItems.map((item) => (
                      <NavLink key={item.href} item={item} active={pathname === item.href} />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  {mainItems.map((item) => (
                    <NavLink key={item.href} item={item} active={isActive(item)} />
                  ))}
                </div>

                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Hackathons</div>
                  <div className="space-y-1">
                    {hackathonItems.map((item) => (
                      <NavLink key={item.href} item={item} active={isActive(item)} />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Manage</div>
                  <div className="space-y-1">
                    {manageItems.map((item) => (
                      <NavLink key={item.href} item={item} active={isActive(item)} />
                    ))}
                  </div>
                </div>

                {organization && tenantSlug && (
                  <div>
                    <Link
                      href={`/o/${tenantSlug}`}
                      target="_blank"
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
                    >
                      <Globe className="size-4" />
                      <span>Organization Page</span>
                      <ExternalLink className="size-3 ml-auto text-muted-foreground" />
                    </Link>
                  </div>
                )}
              </>
            )}
          </nav>

          <Separator />

          {/* Footer: user + theme */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Theme</span>
              <ThemeSwitcher />
            </div>
            <div className="flex items-center gap-3">
              {user?.imageUrl ? (
                <Image
                  src={user.imageUrl}
                  alt={user.fullName || "User"}
                  width={32}
                  height={32}
                  className="size-8 rounded-full"
                />
              ) : (
                <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {user?.firstName?.charAt(0) || "U"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {user?.fullName || user?.firstName || "User"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {user?.emailAddresses[0]?.emailAddress}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setOpen(false)
                  openUserProfile()
                }}
              >
                <UserCog className="size-4 mr-1.5" />
                Account
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => signOut({ redirectUrl: "/sign-in" })}
              >
                <LogOut className="size-4 mr-1.5" />
                Sign out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <CreateOrganizationDialog
        open={createOrgOpen}
        onOpenChange={setCreateOrgOpen}
      />
    </>
  )
}

function NavLink({
  item,
  active,
}: {
  item: { title: string; href: string; icon: React.ComponentType<{ className?: string }> }
  active: boolean
}) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ${
        active
          ? "bg-accent text-accent-foreground font-medium"
          : "hover:bg-accent text-foreground"
      }`}
    >
      <item.icon className="size-4" />
      <span>{item.title}</span>
    </Link>
  )
}
