import { Text } from "@react-email/components"
import { OatmealLayout } from "./_components/oatmeal-layout"
import { InfoBox } from "./_components/info-box"
import { CTAButton } from "./_components/cta-button"
import { colors } from "./_components/constants"

interface TeamInvitationEmailProps {
  inviterName: string
  teamName: string
  hackathonName: string
  acceptUrl: string
  expiresDate: string
}

export default function TeamInvitationEmail({
  inviterName,
  teamName,
  hackathonName,
  acceptUrl,
  expiresDate,
}: TeamInvitationEmailProps) {
  return (
    <OatmealLayout
      heading="You're Invited to Join a Team!"
      preview={`${inviterName} invited you to join "${teamName}" for ${hackathonName}`}
    >
      <Text style={{ fontSize: "14px", marginBottom: "24px", lineHeight: "1.6" }}>
        <strong>{inviterName}</strong> has invited you to join team{" "}
        <strong>&ldquo;{teamName}&rdquo;</strong> for the{" "}
        <strong>{hackathonName}</strong> hackathon.
      </Text>

      <InfoBox label="Team">
        <Text style={{ margin: "0", fontSize: "16px", fontWeight: 600 }}>
          {teamName}
        </Text>
      </InfoBox>

      <CTAButton href={acceptUrl}>Accept Invitation</CTAButton>

      <Text
        style={{
          fontSize: "12px",
          color: colors.textMuted,
          marginTop: "24px",
          lineHeight: "1.5",
        }}
      >
        This invitation expires on {expiresDate}. If you don&rsquo;t have an
        account, you&rsquo;ll be able to create one when accepting.
      </Text>
    </OatmealLayout>
  )
}

TeamInvitationEmail.PreviewProps = {
  inviterName: "Sarah Chen",
  teamName: "Neural Navigators",
  hackathonName: "AI Innovation Hackathon 2026",
  acceptUrl: "https://getoatmeal.com/invite/abc123",
  expiresDate: "Friday, April 17, 2026",
} satisfies TeamInvitationEmailProps
