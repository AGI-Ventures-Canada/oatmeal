# @agents-server/sdk

Type-safe TypeScript SDK for Agents Server API.

## Installation

```bash
npm install @agents-server/sdk
# or
bun add @agents-server/sdk
```

## Usage

```typescript
import { createClient } from "@agents-server/sdk"

const client = createClient("sk_live_your_api_key", {
  baseUrl: "https://your-domain.com"
})

// Check API key info
const { data: whoami, error } = await client.whoami()
if (error) {
  console.error("Auth failed:", error.error)
} else {
  console.log(whoami)
  // { tenantId: "...", keyId: "...", scopes: ["jobs:create", ...] }
}

// Create a job
const { data: job, error: createError } = await client.jobs.create({
  type: "analyze-document",
  input: { url: "https://example.com/doc.pdf" }
})

if (createError) {
  console.error("Failed to create job:", createError.error)
} else {
  console.log(`Job created: ${job.id}`)
}

// Wait for result (with polling)
try {
  const result = await client.jobs.waitForResult(job.id)
  console.log(result)
} catch (err) {
  console.error("Job failed:", err)
}
```

## API

### `createClient(apiKey, options)`

Creates a new client instance.

**Parameters:**
- `apiKey` - Your API key (starts with `sk_live_`)
- `options.baseUrl` - Base URL for the API (required)

**Returns:** Client instance with typed methods

### `client.whoami()`

Get info about the authenticated API key.

**Returns:** `ApiResponse<{ tenantId, keyId, scopes }>`

### `client.jobs.create(input)`

Create and start a new job.

**Parameters:**
- `input.type` - Job type identifier
- `input.input` - Job input payload (optional)
- `input.idempotencyKey` - Unique key for idempotent requests (optional)

**Returns:** `ApiResponse<{ id, type, status, createdAt }>`

### `client.jobs.get(id)`

Get job status.

**Parameters:**
- `id` - Job ID

**Returns:** `ApiResponse<{ id, type, status, createdAt, updatedAt, completedAt }>`

### `client.jobs.getResult(id)`

Get job result. Returns 202 status if job is still running.

**Parameters:**
- `id` - Job ID

**Returns:** `ApiResponse<{ id, status, result, error, completedAt }>`

### `client.jobs.cancel(id)`

Cancel a running job.

**Parameters:**
- `id` - Job ID

**Returns:** `ApiResponse<{ success: true }>`

### `client.jobs.waitForResult(id, opts?)`

Poll for job completion with automatic retry.

**Parameters:**
- `id` - Job ID
- `opts.maxAttempts` - Max polling attempts (default: 60)
- `opts.intervalMs` - Polling interval in ms (default: 1000)

**Returns:** Job result when completed

**Throws:** Error if job doesn't complete within max attempts

## Response Format

All methods return an `ApiResponse<T>` object:

```typescript
interface ApiResponse<T> {
  data: T | null      // The response data (null if error)
  error: { error: string } | null  // Error message (null if success)
  status: number      // HTTP status code
}
```

Check for errors before using data:

```typescript
const { data, error, status } = await client.jobs.create({
  type: "my-job",
  input: {}
})

if (error) {
  console.error(`Request failed with status ${status}:`, error.error)
  return
}

console.log("Job created:", data)
```

## TypeScript

The SDK is fully typed. You get autocomplete for all methods and response types:

```typescript
import type { Job, JobResult, JobStatus, CreateJobInput, ApiResponse } from "@agents-server/sdk"

const input: CreateJobInput = {
  type: "analyze",
  input: { foo: "bar" }
}

const response: ApiResponse<Job> = await client.jobs.create(input)
if (response.data) {
  const job: Job = response.data
  console.log(job.id, job.status)
}
```

## Rate Limiting

The API uses rate limiting. When rate limited, you'll get a 429 status. The response includes rate limit headers:
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

Implement your own retry logic if needed.

## License

MIT
