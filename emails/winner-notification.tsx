import { Text, Link, Section } from "@react-email/components"
import { OatmealLayout } from "./_components/oatmeal-layout"
import { CTAButton } from "./_components/cta-button"
import { colors } from "./_components/constants"

interface WinnerPrize {
  name: string
  value: string | null
  claimUrl: string | null
}

interface WinnerNotificationEmailProps {
  submissionTitle: string
  rank: string
  hackathonName: string
  resultsUrl: string
  prizes: WinnerPrize[]
  primaryClaimUrl: string | null
}

export default function WinnerNotificationEmail({
  submissionTitle,
  rank,
  hackathonName,
  resultsUrl,
  prizes,
  primaryClaimUrl,
}: WinnerNotificationEmailProps) {
  const hasClaimablePrizes = !!primaryClaimUrl

  return (
    <OatmealLayout
      heading="Congratulations!"
      preview={`${rank} Place in ${hackathonName}!`}
      footerText={`You\u2019re receiving this because you participated in ${hackathonName}.`}
    >
      <Text style={{ fontSize: "14px", marginBottom: "24px", lineHeight: "1.6" }}>
        Your submission <strong>&ldquo;{submissionTitle}&rdquo;</strong> placed{" "}
        <strong>{rank}</strong> in the <strong>{hackathonName}</strong>{" "}
        hackathon!
      </Text>

      {prizes.length > 0 && (
        <Section
          style={{
            background: colors.infoBoxBg,
            padding: "16px 20px",
            marginBottom: "24px",
          }}
        >
          <Text
            style={{
              margin: "0 0 12px 0",
              fontSize: "11px",
              color: colors.textMuted,
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
            }}
          >
            Prizes won
          </Text>
          {prizes.map((prize) => (
            <Text
              key={prize.name}
              style={{
                margin: "0 0 8px 0",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              {prize.name}
              {prize.value ? ` \u2014 ${prize.value}` : ""}
              {prize.claimUrl && (
                <>
                  {" "}
                  <Link
                    href={prize.claimUrl}
                    style={{
                      color: colors.accent,
                      fontSize: "12px",
                      fontWeight: 600,
                      textDecoration: "underline",
                    }}
                  >
                    Claim
                  </Link>
                </>
              )}
            </Text>
          ))}
        </Section>
      )}

      {hasClaimablePrizes && (
        <>
          <CTAButton href={primaryClaimUrl!}>Claim Your Prize</CTAButton>
          <Text
            style={{
              fontSize: "12px",
              color: colors.textSecondary,
              marginTop: "24px",
              lineHeight: "1.5",
            }}
          >
            We just need your name and where to send it.
          </Text>
        </>
      )}

      <CTAButton
        href={resultsUrl}
        variant={hasClaimablePrizes ? "secondary" : "primary"}
      >
        View Results
      </CTAButton>
    </OatmealLayout>
  )
}

WinnerNotificationEmail.PreviewProps = {
  submissionTitle: "SmartRoute AI",
  rank: "1st",
  hackathonName: "AI Innovation Hackathon 2026",
  resultsUrl: "https://getoatmeal.com/e/ai-innovation-2026",
  prizes: [
    {
      name: "Best AI Application",
      value: "$2,000",
      claimUrl: "https://getoatmeal.com/prizes/claim/tk1",
    },
    {
      name: "Most Innovative",
      value: "$500",
      claimUrl: null,
    },
  ],
  primaryClaimUrl: "https://getoatmeal.com/prizes/claim/tk1",
} satisfies WinnerNotificationEmailProps
