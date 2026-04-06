import { Text } from "@react-email/components"
import type { TransitionEvent } from "@/lib/db/hackathon-types"
import { OatmealLayout } from "./_components/oatmeal-layout"
import { InfoBox } from "./_components/info-box"
import { CTAButton } from "./_components/cta-button"

interface TransitionNotificationEmailProps {
  event: TransitionEvent
  hackathonName: string
  eventUrl: string
}

const eventConfig: Record<
  TransitionEvent,
  {
    heading: (name: string) => string
    bodyPrefix: string
    bodySuffix: string
    ctaLabel: string
  }
> = {
  hackathon_started: {
    heading: (name) => `${name} Is Live!`,
    bodyPrefix: "",
    bodySuffix: " has started. Head to the event page to get hacking!",
    ctaLabel: "Go to Event",
  },
  judging_started: {
    heading: () => "Judging Has Begun",
    bodyPrefix: "Judging is now underway for ",
    bodySuffix: ". Check the event page for updates.",
    ctaLabel: "View Event",
  },
  results_published: {
    heading: () => "Results Are In!",
    bodyPrefix: "Results have been published for ",
    bodySuffix: ". See how you did!",
    ctaLabel: "View Results",
  },
  registration_opened: {
    heading: () => "Registration Is Open",
    bodyPrefix: "Registration is now open for ",
    bodySuffix: ". Sign up before spots fill up!",
    ctaLabel: "Register Now",
  },
}

export default function TransitionNotificationEmail({
  event,
  hackathonName,
  eventUrl,
}: TransitionNotificationEmailProps) {
  const config = eventConfig[event]

  return (
    <OatmealLayout
      heading={config.heading(hackathonName)}
      preview={`${config.heading(hackathonName)}`}
      footerText={`You received this because you\u2019re registered for ${hackathonName}.`}
    >
      <Text style={{ fontSize: "14px", marginBottom: "24px", lineHeight: "1.6" }}>
        {config.bodyPrefix}
        <strong>{hackathonName}</strong>
        {config.bodySuffix}
      </Text>

      <InfoBox label="Hackathon">
        <Text style={{ margin: "0", fontSize: "16px", fontWeight: 600 }}>
          {hackathonName}
        </Text>
      </InfoBox>

      <CTAButton href={eventUrl}>{config.ctaLabel}</CTAButton>
    </OatmealLayout>
  )
}

TransitionNotificationEmail.PreviewProps = {
  event: "hackathon_started",
  hackathonName: "AI Innovation Hackathon 2026",
  eventUrl: "https://getoatmeal.com/e/ai-innovation-2026",
} satisfies TransitionNotificationEmailProps
