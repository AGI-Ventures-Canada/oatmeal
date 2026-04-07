import { Text } from "@react-email/components"
import { OatmealLayout } from "./_components/oatmeal-layout"
import { colors } from "./_components/constants"

interface SponsorClaimNotificationEmailProps {
  winnerName: string
  prizeName: string
  hackathonName: string
}

export default function SponsorClaimNotificationEmail({
  winnerName,
  prizeName,
  hackathonName,
}: SponsorClaimNotificationEmailProps) {
  return (
    <OatmealLayout
      heading="Winner Info Ready"
      preview={`${winnerName} claimed ${prizeName}`}
      footerText={`You\u2019re receiving this because your organization sponsors a prize in ${hackathonName}.`}
    >
      <Text style={{ fontSize: "14px", marginBottom: "16px", lineHeight: "1.6" }}>
        <strong>{winnerName}</strong> has claimed the{" "}
        <strong>{prizeName}</strong> prize from {hackathonName}.
      </Text>

      <Text
        style={{
          fontSize: "13px",
          color: colors.textMuted,
          lineHeight: "1.5",
        }}
      >
        Their contact and delivery details are now available. The event organizer
        will coordinate fulfillment.
      </Text>
    </OatmealLayout>
  )
}

SponsorClaimNotificationEmail.PreviewProps = {
  winnerName: "Jane Smith",
  prizeName: "Best AI Application",
  hackathonName: "AI Innovation Hackathon 2026",
} satisfies SponsorClaimNotificationEmailProps
