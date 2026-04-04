import { mock } from "bun:test"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any

if (!g.__clerkState) {
  throw new Error("test-setup.ts must be loaded before clerk-mock.ts — ensure it is listed in the bun preload config")
}

export const clerkState = g.__clerkState

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
