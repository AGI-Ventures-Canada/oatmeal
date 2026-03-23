import { mock } from "bun:test"

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
// Clerk State
// ============================================================================

let currentAuth: Record<string, unknown> = { isSignedIn: true, userId: "user_test", orgId: null, orgRole: null }
let currentUser: Record<string, unknown> | null = { id: "user_test", firstName: "Test", fullName: "Test User", imageUrl: null, emailAddresses: [] }
let currentIsSignedIn = true
let currentClerk: Record<string, unknown> = {}
let currentOrganization: Record<string, unknown> | null = null
let currentMemberships: Array<Record<string, unknown>> = []
let currentSetActive = mock(() => Promise.resolve())

export function setClerkAuth(auth: Record<string, unknown>) {
  currentAuth = auth
}

export function setClerkUser(user: Record<string, unknown> | null) {
  currentUser = user
}

export function setClerkIsSignedIn(isSignedIn: boolean) {
  currentIsSignedIn = isSignedIn
}

export function setClerkInstance(clerk: Record<string, unknown>) {
  currentClerk = { ...currentClerk, ...clerk }
}

export function setClerkOrganization(org: Record<string, unknown> | null) {
  currentOrganization = org
}

export function setClerkMemberships(memberships: Array<Record<string, unknown>>) {
  currentMemberships = memberships
}

export function setClerkSetActive(fn: typeof currentSetActive) {
  currentSetActive = fn
}

export function getSetActive() {
  return currentSetActive
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
  currentAuth = { isSignedIn: true, userId: "user_test", orgId: null, orgRole: null }
  currentUser = { id: "user_test", firstName: "Test", fullName: "Test User", imageUrl: null, emailAddresses: [] }
  currentIsSignedIn = true
  currentClerk = {}
  currentOrganization = null
  currentMemberships = []
  currentSetActive = mock(() => Promise.resolve())
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
  useAuth: () => ({ isSignedIn: currentIsSignedIn, userId: currentAuth.userId, orgId: currentAuth.orgId, orgRole: currentAuth.orgRole }),
  useUser: () => ({ isLoaded: true, isSignedIn: currentIsSignedIn, user: currentUser }),
  useClerk: () => currentClerk,
  useOrganization: () => ({ organization: currentOrganization }),
  useOrganizationList: () => ({
    userMemberships: { data: currentMemberships },
    setActive: currentSetActive,
  }),
  auth: mock(() => Promise.resolve({ userId: currentAuth.userId ?? "user_test", orgId: currentAuth.orgId ?? null })),
}))

mock.module("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open !== false ? <div>{children}</div> : null,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div role="dialog" className={className}>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean; [key: string]: unknown }) => (
    <div>{children}</div>
  ),
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
