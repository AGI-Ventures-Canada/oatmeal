# Email Service (Resend)

This directory contains the Resend SDK integration for sending and receiving emails.

## Overview

Resend provides email sending with tracking, plus inbound email support via webhooks. Used for:
- Agent notifications (run started, completed, failed)
- Email-triggered agents (inbound emails trigger agent runs)

## Key Files

```
lib/email/
└── resend.ts    # Resend SDK wrapper
```

## Sending Email

### Basic Email

```typescript
import { sendEmail } from "@/lib/email/resend"

await sendEmail({
  to: "user@example.com",
  subject: "Hello",
  html: "<p>Email content</p>",
  text: "Email content",
})
```

### Agent Notifications

```typescript
import { sendAgentNotification } from "@/lib/email/resend"

await sendAgentNotification(
  "user@example.com",
  "My Agent",
  "run_123",
  "completed",
  { output: "Task completed successfully" }
)
```

## Receiving Email

### Webhook Setup

1. Configure Resend inbound domain
2. Set `RESEND_WEBHOOK_SECRET` for signature verification
3. Webhook endpoint: `POST /api/public/webhooks/resend`

### Inbound Email Flow

```
Email arrives → Resend webhook → Verify signature →
  Store email → Find linked agent → Trigger run
```

### Email Address Configuration

```typescript
import { createEmailAddress, generateInboundEmailAddress } from "@/lib/services/triggers"

// Auto-generate address
const address = generateInboundEmailAddress(tenantId)
// Returns: inbox-abc123@agents.resend.app

// Or use custom domain
await createEmailAddress({
  tenantId,
  address: "receipts@mycompany.com",
  domain: "mycompany.com",
  isCustomDomain: true,
  agentId: "...",  // Link to agent
})
```

### Webhook Verification

```typescript
import { verifyResendWebhook } from "@/lib/email/resend"

const isValid = verifyResendWebhook(rawBody, {
  svixId: headers["svix-id"],
  svixTimestamp: headers["svix-timestamp"],
  svixSignature: headers["svix-signature"],
})
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend API key (required) |
| `RESEND_FROM_EMAIL` | Default from address |
| `RESEND_WEBHOOK_SECRET` | For verifying inbound webhooks |
| `RESEND_RECEIVING_DOMAIN` | Domain for inbound email addresses |

## Email-Triggered Agent Example

1. Create inbound email address:
```typescript
await createEmailAddress({
  tenantId,
  address: "receipts@org.resend.app",
  domain: "org.resend.app",
  agentId: receiptParserAgentId,
})
```

2. When email arrives, agent runs with input:
```json
{
  "trigger": "email",
  "from": "store@example.com",
  "subject": "Your Receipt",
  "body": "Receipt details...",
  "attachments": [...]
}
```

## Documentation Links

- Introduction: https://resend.com/docs/introduction
- Send with Node.js: https://resend.com/docs/send-with-nodejs
- Send with Next.js: https://resend.com/docs/send-with-nextjs
- API Reference: https://resend.com/docs/api-reference/emails/send-email
- Retrieve Email: https://resend.com/docs/api-reference/emails/retrieve-email
- Receiving Emails: https://resend.com/docs/dashboard/receiving/introduction
