# API Code Samples

Code samples for integrating with the Agents Server API.

## Authentication

All v1 API endpoints require an API key passed in the `Authorization` header:

```
Authorization: Bearer sk_live_your_api_key_here
```

## Endpoints

### GET /api/v1/whoami

Returns information about the authenticated API key.

#### curl

```bash
curl -X GET "https://your-domain.com/api/v1/whoami" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

#### TypeScript

```typescript
const response = await fetch("https://your-domain.com/api/v1/whoami", {
  headers: {
    Authorization: "Bearer sk_live_your_api_key_here",
  },
});

const data = await response.json();
// { tenantId: "...", keyId: "...", scopes: ["jobs:create", ...] }
```

#### Python

```python
import requests

response = requests.get(
    "https://your-domain.com/api/v1/whoami",
    headers={"Authorization": "Bearer sk_live_your_api_key_here"}
)

data = response.json()
# {"tenantId": "...", "keyId": "...", "scopes": ["jobs:create", ...]}
```

---

### POST /api/v1/jobs

Creates a new job and starts its workflow execution.

#### curl

```bash
curl -X POST "https://your-domain.com/api/v1/jobs" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "process-document",
    "input": {
      "documentUrl": "https://example.com/doc.pdf",
      "options": { "extractText": true }
    }
  }'
```

With idempotency key (recommended for retries):

```bash
curl -X POST "https://your-domain.com/api/v1/jobs" \
  -H "Authorization: Bearer sk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-request-id-123" \
  -d '{"type": "process-document", "input": {...}}'
```

#### TypeScript

```typescript
interface CreateJobRequest {
  type: string;
  input?: Record<string, unknown>;
  idempotencyKey?: string;
}

interface JobResponse {
  id: string;
  type: string;
  status: "queued" | "running" | "succeeded" | "failed" | "canceled";
  createdAt: string;
}

async function createJob(request: CreateJobRequest): Promise<JobResponse> {
  const response = await fetch("https://your-domain.com/api/v1/jobs", {
    method: "POST",
    headers: {
      Authorization: "Bearer sk_live_your_api_key_here",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to create job: ${response.status}`);
  }

  return response.json();
}

// Usage
const job = await createJob({
  type: "process-document",
  input: {
    documentUrl: "https://example.com/doc.pdf",
    options: { extractText: true },
  },
});
console.log(`Job created: ${job.id}`);
```

#### Python

```python
import requests
from typing import Any

def create_job(job_type: str, input_data: dict[str, Any] | None = None, idempotency_key: str | None = None) -> dict:
    headers = {
        "Authorization": "Bearer sk_live_your_api_key_here",
        "Content-Type": "application/json",
    }

    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key

    payload = {"type": job_type}
    if input_data:
        payload["input"] = input_data

    response = requests.post(
        "https://your-domain.com/api/v1/jobs",
        headers=headers,
        json=payload
    )
    response.raise_for_status()
    return response.json()

# Usage
job = create_job(
    job_type="process-document",
    input_data={
        "documentUrl": "https://example.com/doc.pdf",
        "options": {"extractText": True}
    }
)
print(f"Job created: {job['id']}")
```

---

### GET /api/v1/jobs/:id

Returns the current status and metadata of a job.

#### curl

```bash
curl -X GET "https://your-domain.com/api/v1/jobs/job_abc123" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

#### TypeScript

```typescript
interface JobStatus {
  id: string;
  type: string;
  status: "queued" | "running" | "succeeded" | "failed" | "canceled";
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

async function getJobStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(
    `https://your-domain.com/api/v1/jobs/${jobId}`,
    {
      headers: {
        Authorization: "Bearer sk_live_your_api_key_here",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get job: ${response.status}`);
  }

  return response.json();
}
```

#### Python

```python
import requests

def get_job_status(job_id: str) -> dict:
    response = requests.get(
        f"https://your-domain.com/api/v1/jobs/{job_id}",
        headers={"Authorization": "Bearer sk_live_your_api_key_here"}
    )
    response.raise_for_status()
    return response.json()
```

---

### GET /api/v1/jobs/:id/result

Returns the result of a completed job. Returns 202 if job is still running.

#### curl

```bash
curl -X GET "https://your-domain.com/api/v1/jobs/job_abc123/result" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

#### TypeScript

```typescript
interface JobResult {
  id: string;
  status: "succeeded" | "failed" | "canceled";
  result: unknown;
  error: unknown;
  completedAt: string;
}

async function getJobResult(jobId: string): Promise<JobResult | null> {
  const response = await fetch(
    `https://your-domain.com/api/v1/jobs/${jobId}/result`,
    {
      headers: {
        Authorization: "Bearer sk_live_your_api_key_here",
      },
    }
  );

  if (response.status === 202) {
    // Job still running
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to get result: ${response.status}`);
  }

  return response.json();
}

// Polling example
async function waitForResult(jobId: string, maxAttempts = 60): Promise<JobResult> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await getJobResult(jobId);
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Job timed out");
}
```

#### Python

```python
import requests
import time

def get_job_result(job_id: str) -> dict | None:
    response = requests.get(
        f"https://your-domain.com/api/v1/jobs/{job_id}/result",
        headers={"Authorization": "Bearer sk_live_your_api_key_here"}
    )

    if response.status_code == 202:
        return None  # Job still running

    response.raise_for_status()
    return response.json()

def wait_for_result(job_id: str, max_attempts: int = 60, interval: float = 1.0) -> dict:
    """Poll for job result with timeout."""
    for _ in range(max_attempts):
        result = get_job_result(job_id)
        if result:
            return result
        time.sleep(interval)
    raise TimeoutError(f"Job {job_id} did not complete in time")
```

---

### POST /api/v1/jobs/:id/cancel

Cancels a queued or running job.

#### curl

```bash
curl -X POST "https://your-domain.com/api/v1/jobs/job_abc123/cancel" \
  -H "Authorization: Bearer sk_live_your_api_key_here"
```

#### TypeScript

```typescript
async function cancelJob(jobId: string): Promise<boolean> {
  const response = await fetch(
    `https://your-domain.com/api/v1/jobs/${jobId}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: "Bearer sk_live_your_api_key_here",
      },
    }
  );

  if (response.status === 400) {
    // Job not found or already completed
    return false;
  }

  if (!response.ok) {
    throw new Error(`Failed to cancel job: ${response.status}`);
  }

  return true;
}
```

#### Python

```python
import requests

def cancel_job(job_id: str) -> bool:
    response = requests.post(
        f"https://your-domain.com/api/v1/jobs/{job_id}/cancel",
        headers={"Authorization": "Bearer sk_live_your_api_key_here"}
    )

    if response.status_code == 400:
        return False  # Job not found or already completed

    response.raise_for_status()
    return True
```

---

## Complete Example: Submit and Wait for Job

### TypeScript

```typescript
async function runJob(type: string, input: Record<string, unknown>) {
  // Create job
  const job = await createJob({ type, input });
  console.log(`Job ${job.id} created with status: ${job.status}`);

  // Wait for completion
  const result = await waitForResult(job.id);

  if (result.status === "succeeded") {
    console.log("Job succeeded:", result.result);
    return result.result;
  } else {
    console.error("Job failed:", result.error);
    throw new Error(`Job failed: ${JSON.stringify(result.error)}`);
  }
}

// Usage
const output = await runJob("analyze-text", {
  text: "Hello, world!",
  language: "en",
});
```

### Python

```python
def run_job(job_type: str, input_data: dict) -> Any:
    """Submit a job and wait for its result."""
    # Create job
    job = create_job(job_type, input_data)
    print(f"Job {job['id']} created with status: {job['status']}")

    # Wait for completion
    result = wait_for_result(job["id"])

    if result["status"] == "succeeded":
        print("Job succeeded:", result["result"])
        return result["result"]
    else:
        print("Job failed:", result["error"])
        raise Exception(f"Job failed: {result['error']}")

# Usage
output = run_job("analyze-text", {
    "text": "Hello, world!",
    "language": "en"
})
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "error": "Error message here"
}
```

Common HTTP status codes:
- `400` - Bad request (invalid input)
- `401` - Unauthorized (missing or invalid API key)
- `403` - Forbidden (missing required scope)
- `404` - Not found
- `429` - Rate limit exceeded
- `500` - Internal server error

### Rate Limiting

When rate limited, the response includes headers:
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

```typescript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const resetAt = response.headers.get("X-RateLimit-Reset");
      const waitMs = resetAt
        ? Math.max(0, Number(resetAt) * 1000 - Date.now())
        : 1000 * (i + 1);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      continue;
    }

    return response;
  }
  throw new Error("Max retries exceeded");
}
```
