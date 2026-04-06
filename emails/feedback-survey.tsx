import { Text } from "@react-email/components"
import { OatmealLayout } from "./_components/oatmeal-layout"
import { CTAButton } from "./_components/cta-button"

interface FeedbackSurveyEmailProps {
  participantName: string
  hackathonName: string
  surveyUrl: string
}

export default function FeedbackSurveyEmail({
  participantName,
  hackathonName,
  surveyUrl,
}: FeedbackSurveyEmailProps) {
  return (
    <OatmealLayout
      heading="Share Your Feedback"
      preview={`Share your thoughts on ${hackathonName}`}
      footerText={`You\u2019re receiving this because you participated in ${hackathonName}.`}
    >
      <Text style={{ fontSize: "14px", marginBottom: "24px", lineHeight: "1.6" }}>
        Hi {participantName}, thanks for participating in{" "}
        <strong>{hackathonName}</strong>! We&rsquo;d love to hear your thoughts
        so we can make future events even better.
      </Text>

      <CTAButton href={surveyUrl}>Share Your Feedback</CTAButton>
    </OatmealLayout>
  )
}

FeedbackSurveyEmail.PreviewProps = {
  participantName: "Jordan",
  hackathonName: "AI Innovation Hackathon 2026",
  surveyUrl: "https://forms.example.com/feedback",
} satisfies FeedbackSurveyEmailProps
