import { Button, Section } from "@react-email/components"
import { colors } from "./constants"

interface CTAButtonProps {
  href: string
  children: React.ReactNode
  variant?: "primary" | "secondary"
}

export function CTAButton({
  href,
  children,
  variant = "primary",
}: CTAButtonProps) {
  const isPrimary = variant === "primary"

  return (
    <Section style={{ textAlign: "center" as const }}>
      <Button
        href={href}
        style={{
          display: "inline-block",
          background: isPrimary ? colors.accent : "transparent",
          color: isPrimary ? colors.white : colors.textPrimary,
          padding: "12px 24px",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "14px",
          ...(isPrimary ? {} : { border: `1px solid ${colors.border}` }),
        }}
      >
        {children}
      </Button>
    </Section>
  )
}
