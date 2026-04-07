import { Text, Section } from "@react-email/components"
import { OatmealLayout } from "./_components/oatmeal-layout"
import { InfoBox } from "./_components/info-box"
import { colors } from "./_components/constants"

interface AgentNotificationEmailProps {
  agentName: string
  runId: string
  type: "started" | "completed" | "failed"
  output?: string
  error?: string
}

const typeLabels: Record<string, string> = {
  started: "Started",
  completed: "Completed",
  failed: "Failed",
}

export default function AgentNotificationEmail({
  agentName,
  runId,
  type,
  output,
  error,
}: AgentNotificationEmailProps) {
  return (
    <OatmealLayout
      heading="Agent Run Notification"
      preview={`Agent "${agentName}" ${typeLabels[type].toLowerCase()}`}
      footerText="This is an automated notification from your Oatmeal agent."
    >
      <InfoBox label="Agent">
        <Text style={{ margin: "0", fontSize: "16px", fontWeight: 600 }}>
          {agentName}
        </Text>
      </InfoBox>

      <Text style={{ fontSize: "14px", marginBottom: "24px", lineHeight: "1.6" }}>
        <strong>Run ID:</strong> {runId}
        <br />
        <strong>Status:</strong> {typeLabels[type]}
      </Text>

      {type === "completed" && output && (
        <Section
          style={{
            background: colors.infoBoxBg,
            padding: "16px 20px",
            marginBottom: "24px",
            overflowX: "auto" as const,
          }}
        >
          <Text
            style={{
              margin: "0 0 8px 0",
              fontSize: "11px",
              color: colors.textMuted,
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
            }}
          >
            Output
          </Text>
          <pre
            style={{
              margin: "0",
              fontSize: "12px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word" as const,
            }}
          >
            {output}
          </pre>
        </Section>
      )}

      {type === "failed" && error && (
        <Section
          style={{
            background: colors.infoBoxBg,
            padding: "16px 20px",
            marginBottom: "24px",
            overflowX: "auto" as const,
          }}
        >
          <Text
            style={{
              margin: "0 0 8px 0",
              fontSize: "11px",
              color: colors.textMuted,
              textTransform: "uppercase" as const,
              letterSpacing: "0.05em",
            }}
          >
            Error
          </Text>
          <pre
            style={{
              margin: "0",
              fontSize: "12px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word" as const,
            }}
          >
            {error}
          </pre>
        </Section>
      )}
    </OatmealLayout>
  )
}

AgentNotificationEmail.PreviewProps = {
  agentName: "Receipt Parser",
  runId: "run_abc123def456",
  type: "completed",
  output: "Successfully parsed 3 receipts from inbox.\nTotal: $247.83\nCategories: Office Supplies, Software, Travel",
} satisfies AgentNotificationEmailProps
