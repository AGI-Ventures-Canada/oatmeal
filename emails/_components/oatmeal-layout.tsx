import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Hr,
  Text,
} from "@react-email/components"
import { colors, fontFamily } from "./constants"

interface OatmealLayoutProps {
  heading: string
  preview?: string
  children: React.ReactNode
  footerText?: string
}

export function OatmealLayout({
  heading,
  preview,
  children,
  footerText = "If you didn\u2019t expect this, you can safely ignore this email.",
}: OatmealLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      {preview && <Preview>{preview}</Preview>}
      <Body
        style={{
          fontFamily,
          lineHeight: "1.6",
          color: colors.textPrimary,
          maxWidth: "600px",
          margin: "0 auto",
          padding: "20px",
          backgroundColor: colors.pageBg,
        }}
      >
        <Container>
          <Section style={{ borderTop: `3px solid ${colors.accent}` }}>
            <Section
              style={{
                background: colors.headerBg,
                padding: "32px",
              }}
            >
              <Heading
                style={{
                  color: colors.white,
                  margin: "0",
                  fontSize: "20px",
                  fontWeight: 600,
                  letterSpacing: "-0.025em",
                }}
              >
                {heading}
              </Heading>
            </Section>

            <Section
              style={{
                background: colors.bodyBg,
                padding: "32px",
                border: `1px solid ${colors.border}`,
                borderTop: "none",
              }}
            >
              {children}

              <Hr
                style={{
                  border: "none",
                  borderTop: `1px solid ${colors.border}`,
                  margin: "24px 0",
                }}
              />

              <Text
                style={{
                  fontSize: "11px",
                  color: colors.textFooter,
                  margin: "0",
                  lineHeight: "1.5",
                }}
              >
                {footerText}
              </Text>
            </Section>
          </Section>

          <Text
            style={{
              fontSize: "11px",
              color: colors.textFooter,
              textAlign: "center" as const,
              margin: "16px 0 0 0",
              letterSpacing: "0.05em",
              textTransform: "uppercase" as const,
            }}
          >
            Oatmeal
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
