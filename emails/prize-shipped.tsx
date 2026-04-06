import { Section, Text } from "@react-email/components"
import { OatmealLayout } from "./_components/oatmeal-layout"
import { colors } from "./_components/constants"

interface PrizeShippedEmailProps {
  recipientName: string
  prizeName: string
  hackathonName: string
  trackingNumber: string | null
}

export default function PrizeShippedEmail({
  recipientName,
  prizeName,
  hackathonName,
  trackingNumber,
}: PrizeShippedEmailProps) {
  return (
    <OatmealLayout
      heading="Your Prize is On Its Way!"
      preview={`${prizeName} from ${hackathonName} has been shipped`}
      footerText={`You\u2019re receiving this because you claimed a prize from ${hackathonName}.`}
    >
      <Text style={{ fontSize: "14px", marginBottom: "16px", lineHeight: "1.6" }}>
        Hi {recipientName}, great news! Your prize{" "}
        <strong>{prizeName}</strong> from {hackathonName} has been shipped.
      </Text>

      {trackingNumber && (
        <Section
          style={{
            background: colors.infoBoxBg,
            padding: "12px 16px",
            marginBottom: "16px",
          }}
        >
          <Text style={{ margin: "0", fontSize: "14px" }}>
            <strong>Tracking number:</strong> {trackingNumber}
          </Text>
        </Section>
      )}

      <Text
        style={{
          fontSize: "13px",
          color: colors.textMuted,
          lineHeight: "1.5",
        }}
      >
        If you have any questions about delivery, contact the event organizer.
      </Text>
    </OatmealLayout>
  )
}

PrizeShippedEmail.PreviewProps = {
  recipientName: "Jane",
  prizeName: "Best AI Application",
  hackathonName: "AI Innovation Hackathon 2026",
  trackingNumber: "1Z999AA10123456784",
} satisfies PrizeShippedEmailProps
