import { describe, it, expect, beforeEach, mock, spyOn } from "bun:test"

const mockGetUser = mock(() =>
  Promise.resolve({ primaryEmailAddress: { emailAddress: "solo@test.com" } })
)
const mockGetUserList = mock(() =>
  Promise.resolve({
    data: [{ primaryEmailAddress: { emailAddress: "user@test.com" } }],
  })
)
const mockGetOrgMembers = mock(() =>
  Promise.resolve({
    data: [{ publicUserData: { userId: "user_1" } }],
  })
)

mock.module("@clerk/nextjs/server", () => ({
  clerkClient: () =>
    Promise.resolve({
      users: { getUser: mockGetUser, getUserList: mockGetUserList },
      organizations: { getOrganizationMembershipList: mockGetOrgMembers },
    }),
}))

const { resolveEmailsForTenant } = await import("@/lib/email/utils")

describe("resolveEmailsForTenant", () => {
  let warnSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    mockGetUser.mockClear()
    mockGetUserList.mockClear()
    mockGetOrgMembers.mockClear()
    mockGetUser.mockImplementation(() =>
      Promise.resolve({ primaryEmailAddress: { emailAddress: "solo@test.com" } })
    )
    mockGetUserList.mockImplementation(() =>
      Promise.resolve({
        data: [{ primaryEmailAddress: { emailAddress: "user@test.com" } }],
      })
    )
    mockGetOrgMembers.mockImplementation(() =>
      Promise.resolve({
        data: [{ publicUserData: { userId: "user_1" } }],
      })
    )
    warnSpy = spyOn(console, "warn").mockImplementation(() => {})
  })

  it("returns emails for org tenant", async () => {
    mockGetOrgMembers.mockImplementation(() =>
      Promise.resolve({
        data: [
          { publicUserData: { userId: "user_1" } },
          { publicUserData: { userId: "user_2" } },
        ],
      })
    )
    mockGetUserList.mockImplementation(() =>
      Promise.resolve({
        data: [
          { primaryEmailAddress: { emailAddress: "a@test.com" } },
          { primaryEmailAddress: { emailAddress: "b@test.com" } },
        ],
      })
    )

    const emails = await resolveEmailsForTenant({
      clerk_org_id: "org_123",
      clerk_user_id: null,
    })

    expect(emails).toEqual(["a@test.com", "b@test.com"])
  })

  it("returns email for individual user tenant", async () => {
    const emails = await resolveEmailsForTenant({
      clerk_org_id: null,
      clerk_user_id: "user_solo",
    })

    expect(emails).toEqual(["solo@test.com"])
    expect(mockGetUser).toHaveBeenCalledWith("user_solo")
  })

  it("returns empty array when no tenant identifiers", async () => {
    const emails = await resolveEmailsForTenant({
      clerk_org_id: null,
      clerk_user_id: null,
    })

    expect(emails).toEqual([])
  })

  it("skips members without userId", async () => {
    mockGetOrgMembers.mockImplementation(() =>
      Promise.resolve({
        data: [
          { publicUserData: { userId: "user_1" } },
          { publicUserData: null },
          { publicUserData: { userId: undefined } },
        ],
      })
    )
    mockGetUserList.mockImplementation(() =>
      Promise.resolve({
        data: [{ primaryEmailAddress: { emailAddress: "a@test.com" } }],
      })
    )

    const emails = await resolveEmailsForTenant({
      clerk_org_id: "org_mixed",
      clerk_user_id: null,
    })

    expect(emails).toEqual(["a@test.com"])
    expect(mockGetUserList).toHaveBeenCalledWith(
      expect.objectContaining({ userId: ["user_1"] })
    )
  })

  it("does not warn when under 500 members", async () => {
    await resolveEmailsForTenant({
      clerk_org_id: "org_small",
      clerk_user_id: null,
    })

    const truncationWarns = warnSpy.mock.calls.filter(
      (args: unknown[]) => typeof args[0] === "string" && (args[0] as string).includes("[email]")
    )
    expect(truncationWarns).toHaveLength(0)
  })

  it("warns when membership list hits 500 limit", async () => {
    const members = Array.from({ length: 500 }, (_, i) => ({
      publicUserData: { userId: `user_${i}` },
    }))
    mockGetOrgMembers.mockImplementation(() => Promise.resolve({ data: members }))

    const users = Array.from({ length: 500 }, (_, i) => ({
      primaryEmailAddress: { emailAddress: `user${i}@test.com` },
    }))
    mockGetUserList.mockImplementation(() => Promise.resolve({ data: users }))

    const emails = await resolveEmailsForTenant({
      clerk_org_id: "org_large",
      clerk_user_id: null,
    })

    expect(emails).toHaveLength(500)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("org_large has 500+ members")
    )
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("getUserList hit 500 limit")
    )
  })
})
