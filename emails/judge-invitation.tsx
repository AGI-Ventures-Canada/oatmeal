import { Text } from "@react-email/components"
import { OatmealLayout } from "./_components/oatmeal-layout"
import { InfoBox } from "./_components/info-box"
import { CTAButton } from "./_components/cta-button"
import { colors } from "./_components/constants"

interface JudgeInvitationEmailProps {
  inviterName: string
  hackathonName: string
  acceptUrl: string
  expiresDate: string
}

export default function JudgeInvitationEmail({
  inviterName,
  hackathonName,
  acceptUrl,
  expiresDate,
}: JudgeInvitationEmailProps) {
  return (
    <OatmealLayout
      heading="You're Invited to Judge!"
      preview={`${inviterName} invited you to judge ${hackathonName}`}
      footerText="If you didn&#x2019;t expect this invitation, you can safely ignore this email."
    >
      <Text style={{ fontSize: "14px", marginBottom: "24px", lineHeight: "1.6" }}>
        <strong>{inviterName}</strong> has invited you to be a judge for the{" "}
        <strong>{hackathonName}</strong> hackathon.
      </Text>

      <InfoBox label="Hackathon">
        <Text style={{ margin: "0", fontSize: "16px", fontWeight: 600 }}>
          {hackathonName}
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

JudgeInvitationEmail.PreviewProps = {
  inviterName: "Alex Ivany",
  hackathonName: "AI Innovation Hackathon 2026",
  acceptUrl: "https://getoatmeal.com/judge-invite/xyz789",
  expiresDate: "Friday, April 17, 2026",
} satisfies JudgeInvitationEmailProps
