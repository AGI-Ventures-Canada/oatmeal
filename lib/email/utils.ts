import { render } from "@react-email/components"

export function sanitizeTag(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100)
}

export async function renderEmail(
  element: React.ReactElement
): Promise<{ html: string; text: string }> {
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ])
  return { html, text }
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

// Capped at 500 members — sufficient for hackathon orgs.
// If an org exceeds this, some members won't receive notifications.
export async function resolveEmailsForTenant(tenant: {
  clerk_org_id: string | null
  clerk_user_id: string | null
}): Promise<string[]> {
  const { clerkClient } = await import("@clerk/nextjs/server")
  const clerk = await clerkClient()
  const emails: string[] = []

  if (tenant.clerk_org_id) {
    const memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId: tenant.clerk_org_id,
      limit: 500,
    })

    const memberIds = memberships.data
      .map((m) => m.publicUserData?.userId)
      .filter((id): id is string => !!id)

    if (memberIds.length > 0) {
      const users = await clerk.users.getUserList({ userId: memberIds, limit: 500 })
      for (const user of users.data) {
        const email = user.primaryEmailAddress?.emailAddress
        if (email) emails.push(email)
      }
    }
  } else if (tenant.clerk_user_id) {
    const user = await clerk.users.getUser(tenant.clerk_user_id)
    const email = user.primaryEmailAddress?.emailAddress
    if (email) emails.push(email)
  }

  return emails
}
