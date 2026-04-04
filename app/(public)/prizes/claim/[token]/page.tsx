import { notFound } from "next/navigation"
import { getClaimByToken } from "@/lib/services/prize-fulfillment"
import { PrizeClaimClient } from "./prize-claim-client"
import type { Metadata } from "next"

type PageProps = {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const claim = await getClaimByToken(token)

  if (!claim) {
    return { title: "Prize Claim Not Found" }
  }

  return {
    title: `Claim Your Prize | ${claim.hackathonName}`,
    description: `Claim "${claim.prizeName}" from ${claim.hackathonName}`,
  }
}

export default async function PrizeClaimPage({ params }: PageProps) {
  const { token } = await params
  const claim = await getClaimByToken(token)

  if (!claim) {
    notFound()
  }

  const isExpired = claim.expiresAt ? new Date(claim.expiresAt) < new Date() : false

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
      <PrizeClaimClient
        token={token}
        claim={{
          prizeName: claim.prizeName,
          prizeValue: claim.prizeValue,
          hackathonName: claim.hackathonName,
          hackathonSlug: claim.hackathonSlug,
          submissionTitle: claim.submissionTitle,
          teamName: claim.teamName,
          status: claim.status,
          recipientName: claim.recipientName,
          recipientEmail: claim.recipientEmail,
          shippingAddress: claim.shippingAddress,
          isExpired,
        }}
      />
    </div>
  )
}
