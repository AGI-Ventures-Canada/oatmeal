import { Text } from "@react-email/components"
import { OatmealLayout } from "./_components/oatmeal-layout"
import { CTAButton } from "./_components/cta-button"

interface ResultsAnnouncementEmailProps {
  participantName: string
  hackathonName: string
  resultsUrl: string
}

export default function ResultsAnnouncementEmail({
  participantName,
  hackathonName,
  resultsUrl,
}: ResultsAnnouncementEmailProps) {
  return (
    <OatmealLayout
      heading="Results Are In!"
      preview={`Results for ${hackathonName} have been published`}
      footerText={`You\u2019re receiving this because you participated in ${hackathonName}.`}
    >
      <Text style={{ fontSize: "14px", marginBottom: "24px", lineHeight: "1.6" }}>
        Hi {participantName}, the results for{" "}
        <strong>{hackathonName}</strong> have been published! Check out how
        everyone did.
      </Text>

      <CTAButton href={resultsUrl}>View Results</CTAButton>
    </OatmealLayout>
  )
}

ResultsAnnouncementEmail.PreviewProps = {
  participantName: "Jordan",
  hackathonName: "AI Innovation Hackathon 2026",
  resultsUrl: "https://getoatmeal.com/e/ai-innovation-2026",
} satisfies ResultsAnnouncementEmailProps
