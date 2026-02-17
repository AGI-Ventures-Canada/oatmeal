import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { getJudgeInvitationByToken } from "@/lib/services/judge-invitations"
import { JudgeInviteAcceptClient } from "./judge-invite-accept-client"
import type { Metadata } from "next"

type PageProps = {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const invitation = await getJudgeInvitationByToken(token)

  if (!invitation) {
    return { title: "Invitation Not Found" }
  }

  return {
    title: `Judge ${invitation.hackathon.name}`,
    description: `Accept your invitation to judge ${invitation.hackathon.name}`,
  }
}

export default async function JudgeInvitePage({ params }: PageProps) {
  const { token } = await params
  const { userId } = await auth()

  const invitation = await getJudgeInvitationByToken(token)

  if (!invitation) {
    notFound()
  }

  const isExpired = new Date(invitation.expires_at) < new Date()
  const effectiveStatus = isExpired && invitation.status === "pending" ? "expired" : invitation.status

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
      <JudgeInviteAcceptClient
        token={token}
        invitation={{
          hackathonName: invitation.hackathon.name,
          hackathonSlug: invitation.hackathon.slug,
          email: invitation.email,
          status: effectiveStatus,
          expiresAt: invitation.expires_at,
        }}
        isAuthenticated={!!userId}
      />
    </div>
  )
}
