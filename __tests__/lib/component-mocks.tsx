import React from "react"
import { mock } from "bun:test"
import { clerkState, resetClerkState } from "./clerk-mock"

// ============================================================================
// Next.js Navigation State
// ============================================================================

let currentPathname = "/test"
let currentSearchParams = new URLSearchParams()
let currentRouter: Record<string, unknown> = {
  push: mock(() => {}),
  refresh: mock(() => {}),
  replace: mock(() => {}),
  prefetch: mock(() => {}),
  back: mock(() => {}),
  forward: mock(() => {}),
}

export function setPathname(pathname: string) {
  currentPathname = pathname
}

export function setSearchParams(params: URLSearchParams) {
  currentSearchParams = params
}

export function setRouter(router: Record<string, unknown>) {
  currentRouter = { ...currentRouter, ...router }
}

export function getRouter() {
  return currentRouter
}

// ============================================================================
// Clerk State (delegates to shared clerkState from clerk-mock)
// ============================================================================

export function setClerkAuth(auth: { isSignedIn?: boolean; userId?: string }) {
  if (auth.isSignedIn !== undefined) clerkState.isSignedIn = auth.isSignedIn
  if (auth.userId !== undefined) clerkState.userId = auth.userId
}

export function setClerkUser(user: Record<string, unknown> | null) {
  clerkState.user = user as typeof clerkState.user
}

export function setClerkIsSignedIn(isSignedIn: boolean) {
  clerkState.isSignedIn = isSignedIn
}

export function setClerkInstance(_clerk: Record<string, unknown>) {
  // No-op: openUserProfile/signOut are on clerkState directly
}

export function setClerkOrganization(org: Record<string, unknown> | null) {
  clerkState.organization = org as typeof clerkState.organization
}

export function setClerkMemberships(memberships: Array<Record<string, unknown>>) {
  clerkState.memberships = memberships as typeof clerkState.memberships
}

export function setClerkSetActive(fn: () => Promise<void>) {
  clerkState.setActive.mockImplementation(fn)
}

export function getSetActive() {
  return clerkState.setActive
}

// ============================================================================
// Configurable Component Mock Implementations
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let createHackathonMenuImpl: (props: any) => React.ReactNode =
  ({ trigger }: { trigger: React.ReactNode }) => <div data-testid="create-hackathon-menu">{trigger}</div>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let installSkillButtonImpl: (props: any) => React.ReactNode =
  ({ trigger }: { trigger?: React.ReactNode }) => <div data-testid="install-skill-button">{trigger}</div>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let createOrganizationDialogImpl: (props: any) => React.ReactNode =
  ({ open }: { open: boolean }) =>
    open ? <div data-testid="create-org-dialog" /> : null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setCreateHackathonMenu(impl: (props: any) => React.ReactNode) {
  createHackathonMenuImpl = impl
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setInstallSkillButton(impl: (props: any) => React.ReactNode) {
  installSkillButtonImpl = impl
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setCreateOrganizationDialog(impl: (props: any) => React.ReactNode) {
  createOrganizationDialogImpl = impl
}

// Helpers to switch from stubs to real implementations (call in beforeEach)
export function useRealCreateHackathonMenu() {
  if (realCreateHackathonMenu) createHackathonMenuImpl = realCreateHackathonMenu
}

export function useRealInstallSkillButton() {
  if (realInstallSkillButton) installSkillButtonImpl = realInstallSkillButton
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let realCreateHackathonMenu: ((props: any) => React.ReactNode) | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let realInstallSkillButton: ((props: any) => React.ReactNode) | null = null

// ============================================================================
// Reset
// ============================================================================

export function resetComponentMocks() {
  currentPathname = "/test"
  currentSearchParams = new URLSearchParams()
  currentRouter = {
    push: mock(() => {}),
    refresh: mock(() => {}),
    replace: mock(() => {}),
    prefetch: mock(() => {}),
    back: mock(() => {}),
    forward: mock(() => {}),
  }
  resetClerkState()
  createHackathonMenuImpl = ({ trigger }: { trigger: React.ReactNode }) => <div data-testid="create-hackathon-menu">{trigger}</div>
  installSkillButtonImpl = ({ trigger }: { trigger?: React.ReactNode }) => <div data-testid="install-skill-button">{trigger}</div>
  createOrganizationDialogImpl = ({ open }: { open: boolean }) =>
    open ? <div data-testid="create-org-dialog" /> : null
}

// ============================================================================
// mock.module registrations
// ============================================================================

// Step 1: Mock leaf dependencies first
mock.module("next/navigation", () => ({
  usePathname: () => currentPathname,
  useSearchParams: () => currentSearchParams,
  useRouter: () => currentRouter,
  redirect: mock(() => {}),
  notFound: mock(() => {}),
}))

mock.module("@clerk/nextjs", () => ({
  useAuth: () => ({ isSignedIn: clerkState.isSignedIn, userId: clerkState.userId }),
  useUser: () => ({ isLoaded: clerkState.isLoaded, isSignedIn: clerkState.isSignedIn, user: clerkState.isSignedIn ? clerkState.user : null }),
  useClerk: () => ({ openUserProfile: clerkState.openUserProfile, signOut: clerkState.signOut }),
  useOrganization: () => ({ organization: clerkState.organization }),
  useOrganizationList: () => ({
    userMemberships: { data: clerkState.memberships },
    setActive: clerkState.setActive,
  }),
  auth: mock(() => Promise.resolve({ userId: clerkState.userId ?? "user_test", orgId: null })),
}))

mock.module("@/components/ui/dialog", () => ({
  Dialog: ({ children, open, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (v: boolean) => void }) => {
    const isControlled = open !== undefined
    if (isControlled && !open) return null
    return (
      <div>
        {isControlled && <button type="button" onClick={() => onOpenChange?.(false)}>Close Dialog</button>}
        {children}
      </div>
    )
  },
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div role="dialog" className={className}>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean; [key: string]: unknown }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        "aria-haspopup": "dialog",
        "aria-expanded": "false",
      })
    }
    return <button type="button" aria-haspopup="dialog" aria-expanded={false}>{children}</button>
  },
  DialogClose: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button type="button" {...props}>{children}</button>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogOverlay: () => <div />,
  DialogPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Step 2: Pre-import real component implementations (before mocking them)
// These load using the mocked dependencies above, so hooks/dialog are already shimmed.
const realMenuModule = await import("@/components/hackathon/create-hackathon-menu")
realCreateHackathonMenu = realMenuModule.CreateHackathonMenu as typeof realCreateHackathonMenu

const realSkillModule = await import("@/components/install-skill-button")
realInstallSkillButton = realSkillModule.InstallSkillButton as typeof realInstallSkillButton

// Step 3: Now mock the component modules with configurable closures.
// Default: stubs. Test files can call useReal*() or set*() to switch to real implementations.
mock.module("@/components/hackathon/create-hackathon-menu", () => ({
  CreateHackathonMenu: (props: Record<string, unknown>) => createHackathonMenuImpl(props),
}))

mock.module("@/components/install-skill-button", () => ({
  InstallSkillButton: (props: Record<string, unknown>) => installSkillButtonImpl(props),
}))

mock.module("@/components/create-organization-dialog", () => ({
  CreateOrganizationDialog: (props: Record<string, unknown>) =>
    createOrganizationDialogImpl(props),
}))
