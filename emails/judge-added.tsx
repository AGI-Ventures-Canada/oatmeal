import { Text } from "@react-email/components"
import { OatmealLayout } from "./_components/oatmeal-layout"
import { InfoBox } from "./_components/info-box"
import { CTAButton } from "./_components/cta-button"

interface JudgeAddedEmailProps {
  addedByName: string
  hackathonName: string
  eventUrl: string
}

export default function JudgeAddedEmail({
  addedByName,
  hackathonName,
  eventUrl,
}: JudgeAddedEmailProps) {
  return (
    <OatmealLayout
      heading="You've Been Added as a Judge"
      preview={`${addedByName} added you as a judge for ${hackathonName}`}
    >
      <Text style={{ fontSize: "14px", marginBottom: "24px", lineHeight: "1.6" }}>
        <strong>{addedByName}</strong> has added you as a judge for the{" "}
        <strong>{hackathonName}</strong> hackathon.
      </Text>

      <InfoBox label="Hackathon">
        <Text style={{ margin: "0", fontSize: "16px", fontWeight: 600 }}>
          {hackathonName}
        </Text>
      </InfoBox>

      <CTAButton href={eventUrl}>View Event</CTAButton>
    </OatmealLayout>
  )
}

JudgeAddedEmail.PreviewProps = {
  addedByName: "Alex Ivany",
  hackathonName: "AI Innovation Hackathon 2026",
  eventUrl: "https://getoatmeal.com/e/ai-innovation-2026",
} satisfies JudgeAddedEmailProps
