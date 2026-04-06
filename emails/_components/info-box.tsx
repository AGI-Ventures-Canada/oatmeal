import { Section, Text } from "@react-email/components"
import { colors } from "./constants"

interface InfoBoxProps {
  label: string
  children: React.ReactNode
}

export function InfoBox({ label, children }: InfoBoxProps) {
  return (
    <Section
      style={{
        background: colors.infoBoxBg,
        padding: "16px 20px",
        marginBottom: "24px",
      }}
    >
      <Text
        style={{
          margin: "0 0 4px 0",
          fontSize: "11px",
          color: colors.textMuted,
          textTransform: "uppercase" as const,
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </Text>
      {children}
    </Section>
  )
}
