"use client"

import { useState, useEffect } from "react"
import {
  Trophy,
  Search,
  ChevronsUpDown,
  LogOut,
  Building2,
  Settings,
  UserCog,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Key,
  Clock,
  Webhook,
  Plug,
  Home,
  Users,
  Star,
  Megaphone,
  Globe,
  ExternalLink,
  Plus,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useSearchParams, useRouter } from "next/navigation"
import {
  useUser,
  useClerk,
  useOrganization,
  useOrganizationList,
} from "@clerk/nextjs"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { CreateHackathonMenu } from "@/components/hackathon/create-hackathon-menu"

const navItems = [
  { title: "Dashboard", href: "/home", icon: Home },
  { title: "Browse", href: "/browse", icon: Search },
]

const hackathonSubItems = [
  { title: "Participating", href: "/home?tab=participating", icon: Users },
  { title: "Organizing", href: "/home?tab=organized", icon: Megaphone },
  { title: "Sponsoring", href: "/home?tab=sponsored", icon: Star },
]

const manageItems = [
  { title: "Settings", href: "/settings", icon: Settings },
]

const settingsItems = [
  { title: "Organization", href: "/settings/profile", icon: Building2 },
  { title: "API Keys", href: "/settings/api-keys", icon: Key },
  { title: "Schedules", href: "/settings/schedules", icon: Clock },
  { title: "Webhooks", href: "/settings/webhooks", icon: Webhook },
  { title: "Integrations", href: "/settings/integrations", icon: Plug },
]

export function AppSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useUser()
  const { signOut, openUserProfile } = useClerk()
  const { organization } = useOrganization()
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  })

  const [tenantSlug, setTenantSlug] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!organization) {
      Promise.resolve().then(() => {
        if (!cancelled) setTenantSlug(null)
      })
      return () => { cancelled = true }
    }

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

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-auto py-2">
                  {organization?.imageUrl ? (
                    <img
                      src={organization.imageUrl}
                      alt={organization.name || "Organization"}
                      className="size-6 rounded object-cover"
                    />
                  ) : (
                    <div className="flex size-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-semibold">
                      {organization?.name?.charAt(0).toUpperCase() || user?.firstName?.charAt(0)?.toUpperCase() || "P"}
                    </div>
                  )}
                  <div className="flex-1 text-left text-sm leading-tight truncate">
                    <span className="font-semibold">{organization?.name || "Personal Workspace"}</span>
                  </div>
                  <ChevronsUpDown className="size-4 opacity-50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                align="start"
              >
                <DropdownMenuLabel>Organizations</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setActive?.({ organization: null })
                    router.push("/home")
                  }}
                  className="gap-2"
                >
                  <div className="flex size-5 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-semibold">
                    {user?.firstName?.charAt(0)?.toUpperCase() || "P"}
                  </div>
                  <span className="truncate">Personal Workspace</span>
                </DropdownMenuItem>
                {userMemberships?.data?.map((mem) => (
                  <DropdownMenuItem
                    key={mem.organization.id}
                    onClick={() => {
                      setActive?.({ organization: mem.organization.id })
                      router.push("/home")
                    }}
                    className="gap-2"
                  >
                    {mem.organization.imageUrl ? (
                      <img
                        src={mem.organization.imageUrl}
                        alt={mem.organization.name}
                        className="size-5 rounded object-cover"
                      />
                    ) : (
                      <div className="flex size-5 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-semibold">
                        {mem.organization.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="truncate">{mem.organization.name}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {organization && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/settings/profile">
                        <Settings className="size-4 mr-2" />
                        Organization Settings
                      </Link>
                    </DropdownMenuItem>
                    {tenantSlug && (
                      <DropdownMenuItem asChild>
                        <Link href={`/o/${tenantSlug}`} target="_blank">
                          <Globe className="size-4 mr-2" />
                          Organization Page
                          <ExternalLink className="size-3 ml-auto opacity-50" />
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {isSettingsView ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/home">
                      <ChevronLeft />
                      <span className="font-semibold">Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  <Collapsible defaultOpen className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <Trophy />
                          <span>Hackathons</span>
                          <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {hackathonSubItems.map((item) => {
                            const itemTab = new URL(item.href, "http://x").searchParams.get("tab")
                            const isActive = pathname === "/home" && currentTab === itemTab
                            return (
                              <SidebarMenuSubItem key={item.href}>
                                <SidebarMenuSubButton asChild isActive={isActive}>
                                  <Link href={item.href}>
                                    <item.icon />
                                    <span>{item.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )
                          })}
                          <SidebarMenuSubItem>
                            <CreateHackathonMenu
                              trigger={
                                <SidebarMenuSubButton>
                                  <Plus />
                                  <span>Create Hackathon</span>
                                </SidebarMenuSubButton>
                              }
                            />
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Manage</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {manageItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Resources</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/docs">
                        <BookOpen />
                        <span>Documentation</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-auto py-2">
                  {user?.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={user.fullName || "User"}
                      className="size-6 rounded-full"
                    />
                  ) : (
                    <div className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {user?.firstName?.charAt(0) || user?.emailAddresses[0]?.emailAddress?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                  <div className="flex-1 text-left text-sm leading-tight truncate">
                    <span className="block font-medium truncate">
                      {user?.fullName || user?.firstName || "User"}
                    </span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {user?.emailAddresses[0]?.emailAddress}
                    </span>
                  </div>
                  <ChevronsUpDown className="size-4 opacity-50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                align="start"
                side="top"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.fullName || user?.firstName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.emailAddresses[0]?.emailAddress}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openUserProfile()}>
                  <UserCog className="size-4 mr-2" />
                  Account Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-sm">Theme</span>
                  <ThemeSwitcher />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ redirectUrl: "/sign-in" })}>
                  <LogOut className="size-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
