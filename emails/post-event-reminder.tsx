import { Text } from "@react-email/components"
import { OatmealLayout } from "./_components/oatmeal-layout"
import { CTAButton } from "./_components/cta-button"

interface PostEventReminderEmailProps {
  heading: string
  participantName: string
  body: string
  ctaLabel: string
  ctaUrl: string
  hackathonName: string
}

export default function PostEventReminderEmail({
  heading,
  participantName,
  body,
  ctaLabel,
  ctaUrl,
  hackathonName,
}: PostEventReminderEmailProps) {
  return (
    <OatmealLayout
      heading={heading}
      preview={`${heading} \u2014 ${hackathonName}`}
      footerText={`You\u2019re receiving this because of your involvement in ${hackathonName}.`}
    >
      <Text style={{ fontSize: "14px", marginBottom: "24px", lineHeight: "1.6" }}>
        Hi {participantName}, {body}
      </Text>

      <CTAButton href={ctaUrl}>{ctaLabel}</CTAButton>
    </OatmealLayout>
  )
}

PostEventReminderEmail.PreviewProps = {
  heading: "Don't Forget Your Prize!",
  participantName: "Sarah",
  body: "you won a prize in AI Innovation Hackathon 2026 but haven't claimed it yet. Visit the results page to see your prizes and follow up with the organizers.",
  ctaLabel: "View Results",
  ctaUrl: "https://getoatmeal.com/e/ai-innovation-2026",
  hackathonName: "AI Innovation Hackathon 2026",
} satisfies PostEventReminderEmailProps
