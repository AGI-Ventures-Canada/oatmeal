# Test Directory

## Test Commands

```bash
bun run test              # Unit tests (api, components, services, lib)
bun run test:integration  # Integration tests (*.integration.test.ts)
bun run test:email        # Email tests (*.email.test.ts)
bun run test:all          # All tests sequentially
bun run test --coverage   # With coverage report
```

## File Naming Conventions

| Pattern | Purpose | Mock Strategy |
|---------|---------|---------------|
| `*.test.ts` | Unit tests | Closure-based mocks via supabase-mock.ts |
| `*.integration.test.ts` | API route integration tests | `mock.module` at service layer |
| `*.email.test.ts` | Email functionality tests | `mock.module` for email services |

## Mock Patterns

### When to Use Each Pattern

**Closure-based mocks (unit tests):**
- Testing service layer functions
- Testing utility functions
- When you need fine-grained control over database responses per-test
- Files in `__tests__/services/`, `__tests__/lib/`

**mock.module at service layer (integration tests):**
- Testing API route handlers end-to-end
- When you want to verify request/response handling
- Files in `__tests__/integration/*.integration.test.ts`

**mock.module for external services (email tests):**
- Testing email sending logic
- Testing integrations with external APIs
- Files in `__tests__/integration/*.email.test.ts`

### Why Separate Test Commands?

Bun's `mock.module` persists across tests in the same process. Integration tests mock at the service layer while unit tests mock at the database layer. Running them together causes mock isolation failures where one test's mocks interfere with another's.

## Unit Test Pattern

```typescript
import { describe, it, expect, beforeEach } from "bun:test"
import {
  createChainableMock,
  resetSupabaseMocks,
  setMockFromImplementation,
  mockTableQuery,
  mockSuccess,
  mockError,
} from "../lib/supabase-mock"

const { myServiceFunction } = await import("@/lib/services/my-service")

describe("MyService", () => {
  beforeEach(() => {
    resetSupabaseMocks()
  })

  it("returns data on success", async () => {
    // Option 1: Full control
    setMockFromImplementation(() =>
      createChainableMock({ data: { id: "1" }, error: null })
    )

    // Option 2: Table-specific helper
    mockTableQuery("my_table", mockSuccess({ id: "1" }))

    const result = await myServiceFunction()
    expect(result).not.toBeNull()
  })

  it("handles errors", async () => {
    mockTableQuery("my_table", mockError("Not found"))

    const result = await myServiceFunction()
    expect(result).toBeNull()
  })
})
```

## Integration Test Pattern

```typescript
import { describe, it, expect, beforeEach, mock } from "bun:test"

const mockListItems = mock(() => Promise.resolve([]))
const mockCreateItem = mock(() => Promise.resolve({ id: "new" }))

mock.module("@/lib/services/items", () => ({
  listItems: mockListItems,
  createItem: mockCreateItem,
}))

const { Elysia } = await import("elysia")
const { itemRoutes } = await import("@/lib/api/routes/items")

const app = new Elysia({ prefix: "/api" }).use(itemRoutes)

describe("Item Routes", () => {
  beforeEach(() => {
    mockListItems.mockReset()
    mockCreateItem.mockReset()
  })

  it("GET /items returns list", async () => {
    mockListItems.mockResolvedValue([{ id: "1", name: "Test" }])

    const res = await app.handle(new Request("http://localhost/api/items"))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.items).toHaveLength(1)
  })
})
```

## Email Test Pattern

```typescript
import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test"

const originalEnvValue = process.env.SOME_VAR

let sendEmailImpl = () => Promise.resolve({ id: "email_123" })
const mockSendEmail = mock((input) => sendEmailImpl(input))

mock.module("@/lib/email/resend", () => ({
  sendEmail: mockSendEmail,
}))

const { sendMyEmail } = await import("@/lib/email/my-email")

describe("MyEmail", () => {
  beforeEach(() => {
    mockSendEmail.mockClear()
    sendEmailImpl = () => Promise.resolve({ id: "email_123" })
    process.env.SOME_VAR = "test-value"
  })

  afterEach(() => {
    // Always restore environment variables
    if (originalEnvValue === undefined) {
      delete process.env.SOME_VAR
    } else {
      process.env.SOME_VAR = originalEnvValue
    }
  })

  it("sends email", async () => {
    const result = await sendMyEmail({ to: "test@example.com" })
    expect(result.success).toBe(true)
  })
})
```

## Available Test Utilities

From `__tests__/lib/supabase-mock.ts`:

| Utility | Purpose |
|---------|---------|
| `createChainableMock(result)` | Create a mock that mimics Supabase's fluent API |
| `setMockFromImplementation(fn)` | Set custom behavior for `supabase.from()` |
| `setMockRpcImplementation(fn)` | Set custom behavior for `supabase.rpc()` |
| `resetSupabaseMocks()` | Clear all Supabase mocks (call in beforeEach) |
| `resetClerkMocks()` | Clear all Clerk mocks |
| `resetAllMocks()` | Clear both Supabase and Clerk mocks |
| `mockTableQuery(table, result)` | Mock a specific table query |
| `mockMultiTableQuery(handlers)` | Mock multiple tables with different responses |
| `mockRpcCall(fnName, result)` | Mock a specific RPC function |
| `mockSuccess(data)` | Create a success result |
| `mockError(message)` | Create an error result |
| `mockCount(count)` | Create a count-only result |

## Best Practices

1. **Always reset mocks in beforeEach** - Prevents test pollution
2. **Restore environment variables in afterEach** - Prevents side effects
3. **Use dynamic imports after mock.module** - Ensures mocks are applied
4. **Keep integration tests focused** - Test one route behavior per test
5. **Use helper utilities** - Reduces boilerplate and improves readability
