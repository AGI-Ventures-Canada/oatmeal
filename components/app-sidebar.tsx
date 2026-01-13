"use client"

import { Key, Briefcase, ChevronsUpDown, LogOut, Building2, Settings, UserCog, Bot, BookOpen } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeSwitcher } from "@/components/theme-switcher"

const navItems = [
  { title: "Agents", href: "/agents", icon: Bot },
  { title: "Jobs", href: "/jobs", icon: Briefcase },
  { title: "API Keys", href: "/keys", icon: Key },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const { signOut, openUserProfile, openOrganizationProfile } = useClerk()
  const { organization } = useOrganization()
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  })

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-auto py-2">
                  <div className="flex size-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-semibold">
                    {organization?.name?.charAt(0).toUpperCase() || "O"}
                  </div>
                  <div className="flex-1 text-left text-sm leading-tight truncate">
                    <span className="font-semibold">{organization?.name || "Select Org"}</span>
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
                {userMemberships?.data?.map((mem) => (
                  <DropdownMenuItem
                    key={mem.organization.id}
                    onClick={() => setActive?.({ organization: mem.organization.id })}
                    className="gap-2"
                  >
                    <div className="flex size-5 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-semibold">
                      {mem.organization.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{mem.organization.name}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openOrganizationProfile()}>
                  <Settings className="size-4 mr-2" />
                  Organization Settings
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/onboarding" className="gap-2">
                    <Building2 className="size-4" />
                    Switch Organization
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
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
