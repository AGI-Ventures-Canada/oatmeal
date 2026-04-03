import { mock } from "bun:test"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any

export const clerkState = g.__clerkState ?? {
  isSignedIn: true,
  userId: "user_123",
  user: {
    id: "user_123",
    fullName: "Test User",
    firstName: "Test",
    imageUrl: null as string | null,
  } as { id: string; fullName: string; firstName: string; imageUrl: string | null } | null,
  isLoaded: true,
  organization: null as { id: string; name: string } | null,
  memberships: [] as Array<{
    organization: { id: string; name: string; imageUrl: string | null }
  }>,
  setActive: mock(() => Promise.resolve()),
  openUserProfile: mock(() => {}),
  signOut: mock(() => Promise.resolve()),
}

if (!g.__clerkState) g.__clerkState = clerkState

export function resetClerkState() {
  clerkState.isSignedIn = true
  clerkState.userId = "user_123"
  clerkState.user = {
    id: "user_123",
    fullName: "Test User",
    firstName: "Test",
    imageUrl: null,
  }
  clerkState.isLoaded = true
  clerkState.organization = null
  clerkState.memberships = []
  clerkState.setActive.mockClear()
  clerkState.openUserProfile.mockClear()
  clerkState.signOut.mockClear()
}

export const clerkMock = {
  useUser: () => ({
    isSignedIn: clerkState.isSignedIn,
    user: clerkState.isSignedIn ? clerkState.user : null,
    isLoaded: clerkState.isLoaded,
  }),
  useAuth: () => ({
    isSignedIn: clerkState.isSignedIn,
    isLoaded: clerkState.isLoaded,
    userId: clerkState.userId,
  }),
  useClerk: () => ({
    openUserProfile: clerkState.openUserProfile,
    signOut: clerkState.signOut,
  }),
  useOrganization: () => ({
    organization: clerkState.organization,
    isLoaded: clerkState.isLoaded,
  }),
  useOrganizationList: () => ({
    userMemberships: { data: clerkState.memberships },
    setActive: clerkState.setActive,
  }),
}
