# @agents-server/sdk

Type-safe TypeScript SDK for Agents Server API.

## Installation

```bash
npm install @agents-server/sdk
# or
bun add @agents-server/sdk
```

## Quick Start

```typescript
import { createClient } from "@agents-server/sdk"

const client = createClient(process.env.AGENTS_API_KEY!)

// Run an agent and wait for results
const { data: run } = await client.agents.run("agent-id", {
  prompt: "Analyze this quarter's sales data"
})

const result = await client.agents.waitForResult(run.runId)
console.log(result.status, result.result)
```

## Use Cases

### 1. Document Processing Pipeline

Process documents through an AI agent and handle results:

```typescript
import { createClient } from "@agents-server/sdk"

const client = createClient(process.env.AGENTS_API_KEY!)

async function processDocument(documentUrl: string) {
  // Start the agent run
  const { data: run, error } = await client.agents.run("doc-processor-agent", {
    prompt: `Analyze and summarize the document at: ${documentUrl}`,
    context: { documentUrl }
  })

  if (error) {
    throw new Error(`Failed to start agent: ${error.error}`)
  }

  // Wait for completion (polls every 2 seconds, max 5 minutes)
  const result = await client.agents.waitForResult(run.runId, {
    intervalMs: 2000,
    maxAttempts: 150
  })

  if (result.status === "succeeded") {
    return result.result
  } else {
    throw new Error(`Agent failed: ${JSON.stringify(result.error)}`)
  }
}
```

### 2. Scheduled Reports

Create a schedule to run an agent daily at 9 AM:

```typescript
// Create a daily report schedule
const { data: schedule } = await client.schedules.create({
  name: "Daily Sales Report",
  frequency: "daily",
  timezone: "America/New_York",
  agentId: "sales-report-agent",
  input: { reportType: "daily-summary" }
})

console.log(`Schedule created: ${schedule.id}`)
console.log(`Next run: ${schedule.nextRunAt}`)

// List all active schedules
const { data: schedules } = await client.schedules.list({ activeOnly: true })
console.log(`Active schedules: ${schedules.schedules.length}`)

// Pause a schedule
await client.schedules.update(schedule.id, { isActive: false })

// Delete a schedule
await client.schedules.delete(schedule.id)
```

### 3. Webhook Integration

Receive notifications when agent runs complete:

```typescript
// Create a webhook to receive notifications
const { data: webhook } = await client.webhooks.create({
  url: "https://your-app.com/webhooks/agents",
  events: ["agent_run.completed", "agent_run.failed"]
})

// Save the secret for verifying webhook signatures
console.log(`Webhook secret: ${webhook.secret}`)

// Your webhook handler (Express example)
app.post("/webhooks/agents", (req, res) => {
  const signature = req.headers["x-webhook-signature"]
  // Verify signature using webhook.secret

  const { event, data } = req.body

  if (event === "agent_run.completed") {
    console.log(`Agent run ${data.runId} completed`)
    // Process the result...
  }

  res.status(200).send("OK")
})
```

### 4. Agent Management

Create and manage AI agents programmatically:

```typescript
// Create a new agent
const { data: agent } = await client.agents.create({
  name: "Customer Support Agent",
  description: "Handles customer inquiries",
  instructions: `You are a helpful customer support assistant.
    Answer questions about our products and services.
    Be polite and professional.`,
  model: "claude-sonnet-4-5-20250929"
})

// Update agent instructions
await client.agents.update(agent.id, {
  instructions: "Updated instructions..."
})

// List all agents
const { data: agents } = await client.agents.list()
console.log(`Total agents: ${agents.agents.length}`)

// Deactivate an agent
await client.agents.update(agent.id, { isActive: false })

// Delete an agent
await client.agents.delete(agent.id)
```

### 5. Skill Management

Create reusable skills that agents can use:

```typescript
// Create a skill with custom instructions
const { data: skill } = await client.skills.create({
  name: "SQL Query Generator",
  slug: "sql-generator",
  description: "Generates SQL queries from natural language",
  content: `# SQL Query Generator

When asked to generate SQL queries:
1. Understand the user's intent
2. Identify the relevant tables and columns
3. Generate optimized SQL
4. Explain the query structure`
})

// Assign skill to an agent
await client.agents.update("agent-id", {
  skillIds: [skill.id]
})

// Update skill content
await client.skills.update(skill.id, {
  content: "Updated skill instructions..."
})
```

### 6. Background Jobs

Queue and monitor background jobs:

```typescript
// Create a background job
const { data: job } = await client.jobs.create({
  type: "data-export",
  input: { format: "csv", dateRange: "last-30-days" },
  idempotencyKey: `export-${Date.now()}` // Prevent duplicates
})

// Check job status
const { data: status } = await client.jobs.get(job.id)
console.log(`Job status: ${status.status}`)

// Wait for job completion
const result = await client.jobs.waitForResult(job.id, {
  intervalMs: 1000,
  maxAttempts: 300 // 5 minutes max
})

if (result.status === "succeeded") {
  console.log("Job completed:", result.result)
} else {
  console.error("Job failed:", result.error)
}

// Cancel a running job
await client.jobs.cancel(job.id)
```

## API Reference

### Authentication

```typescript
const client = createClient("sk_live_...")

// Verify API key
const { data: whoami } = await client.whoami()
console.log(whoami.tenantId, whoami.scopes)

// Custom base URL (only for self-hosted deployments)
const customClient = createClient("sk_live_...", { baseUrl: "https://api.example.com" })
```

### Agents

| Method | Description |
|--------|-------------|
| `agents.list()` | List all agents |
| `agents.create(input)` | Create a new agent |
| `agents.get(id)` | Get agent details |
| `agents.update(id, input)` | Update an agent |
| `agents.delete(id)` | Delete an agent |
| `agents.run(id, input)` | Start an agent run |
| `agents.getRun(runId)` | Get run status |
| `agents.getRunResult(runId)` | Get run result |
| `agents.waitForResult(runId, opts?)` | Poll until complete |
| `agents.cancelRun(runId)` | Cancel a running agent |
| `agents.provideInput(runId, input)` | Provide human input |

### Jobs

| Method | Description |
|--------|-------------|
| `jobs.create(input)` | Create a background job |
| `jobs.get(id)` | Get job status |
| `jobs.getResult(id)` | Get job result |
| `jobs.cancel(id)` | Cancel a job |
| `jobs.waitForResult(id, opts?)` | Poll until complete |

### Webhooks

| Method | Description |
|--------|-------------|
| `webhooks.list()` | List all webhooks |
| `webhooks.create(input)` | Create a webhook |
| `webhooks.delete(id)` | Delete a webhook |

### Skills

| Method | Description |
|--------|-------------|
| `skills.list()` | List all skills |
| `skills.create(input)` | Create a skill |
| `skills.get(id)` | Get skill details |
| `skills.update(id, input)` | Update a skill |
| `skills.delete(id)` | Delete a skill |

### Schedules

| Method | Description |
|--------|-------------|
| `schedules.list(opts?)` | List schedules |
| `schedules.create(input)` | Create a schedule |
| `schedules.get(id)` | Get schedule details |
| `schedules.update(id, input)` | Update a schedule |
| `schedules.delete(id)` | Delete a schedule |

## Response Format

All methods return an `ApiResponse<T>`:

```typescript
interface ApiResponse<T> {
  data: T | null           // Response data (null if error)
  error: { error: string } | null  // Error message (null if success)
  status: number           // HTTP status code
}
```

Always check for errors:

```typescript
const { data, error, status } = await client.agents.run(agentId, { prompt })

if (error) {
  console.error(`Failed (${status}):`, error.error)
  return
}

console.log("Run started:", data.runId)
```

## TypeScript Support

The SDK is fully typed with exported interfaces:

```typescript
import type {
  Agent,
  AgentRun,
  AgentRunResult,
  Job,
  JobResult,
  Webhook,
  Skill,
  Schedule,
  CreateAgentInput,
  ApiResponse
} from "@agents-server/sdk"
```

## Error Handling

```typescript
try {
  const result = await client.agents.waitForResult(runId, {
    maxAttempts: 60,
    intervalMs: 1000
  })

  if (result.status === "failed") {
    console.error("Agent run failed:", result.error)
  }
} catch (err) {
  // Timeout or network error
  console.error("Error waiting for result:", err.message)
}
```

## Rate Limiting

The API uses rate limiting. When rate limited, you'll receive a 429 status with headers:

- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## License

MIT
