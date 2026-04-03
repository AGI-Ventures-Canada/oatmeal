import { mock } from "bun:test"
import { Window } from "happy-dom"
import "./__tests__/lib/supabase-mock"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any

g.__nextNavState = {
  pathname: "/test",
  searchParams: new URLSearchParams(),
  router: {
    push: mock(() => {}),
    refresh: mock(() => {}),
    replace: mock(() => {}),
    prefetch: mock(() => {}),
    back: mock(() => {}),
    forward: mock(() => {}),
  },
}

mock.module("next/navigation", () => ({
  usePathname: () => g.__nextNavState.pathname,
  useSearchParams: () => g.__nextNavState.searchParams,
  useRouter: () => g.__nextNavState.router,
  redirect: mock(() => {}),
  notFound: mock(() => {}),
}))

// Canonical Clerk state — shared with __tests__/lib/clerk-mock.ts via globalThis.
// test-setup.ts (bun preload) runs before any test file, so clerk-mock.ts picks
// up this object through `g.__clerkState ?? { ... }` and both files reference the
// same instance. Changing the load order would break that contract.
g.__clerkState = {
  isSignedIn: true,
  userId: "user_123",
  user: { id: "user_123", fullName: "Test User", firstName: "Test", imageUrl: null },
  isLoaded: true,
  organization: null as { id: string; name: string } | null,
  memberships: [] as Array<{ organization: { id: string; name: string; imageUrl: string | null } }>,
  setActive: mock(() => Promise.resolve()),
  openUserProfile: mock(() => {}),
  signOut: mock(() => Promise.resolve()),
}

mock.module("@clerk/nextjs", () => ({
  useAuth: () => ({ isSignedIn: g.__clerkState.isSignedIn, isLoaded: g.__clerkState.isLoaded, userId: g.__clerkState.userId }),
  useUser: () => ({ isLoaded: g.__clerkState.isLoaded, isSignedIn: g.__clerkState.isSignedIn, user: g.__clerkState.isSignedIn ? g.__clerkState.user : null }),
  useClerk: () => ({ openUserProfile: g.__clerkState.openUserProfile, signOut: g.__clerkState.signOut }),
  useOrganization: () => ({ organization: g.__clerkState.organization, isLoaded: g.__clerkState.isLoaded }),
  useOrganizationList: () => ({
    userMemberships: { data: g.__clerkState.memberships },
    setActive: g.__clerkState.setActive,
  }),
  auth: mock(() => Promise.resolve({ userId: g.__clerkState.userId ?? "user_test", orgId: null })),
}))

const window = new Window()
Object.assign(globalThis, {
  window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  Element: window.Element,
  Node: window.Node,
  NodeFilter: window.NodeFilter,
  HTMLInputElement: window.HTMLInputElement,
  HTMLButtonElement: window.HTMLButtonElement,
  HTMLTextAreaElement: window.HTMLTextAreaElement,
  HTMLSelectElement: window.HTMLSelectElement,
  Text: window.Text,
  DocumentFragment: window.DocumentFragment,
  MutationObserver: window.MutationObserver,
  getComputedStyle: window.getComputedStyle.bind(window),
  requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(cb, 0),
  cancelAnimationFrame: (id: number) => clearTimeout(id),
  ResizeObserver: class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
})
