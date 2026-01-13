# TypeScript SDK

This package provides a type-safe TypeScript client for the Agents Server v1 API.

## Structure

```
packages/sdk/
├── src/
│   └── index.ts      # Client implementation and types
├── __tests__/
│   └── client.test.ts # SDK tests
├── dist/             # Compiled output (gitignored)
├── package.json
├── tsconfig.json
└── README.md         # User-facing documentation
```

## Development

```bash
cd packages/sdk
bun run build    # Compile TypeScript
bun run dev      # Watch mode
bun test         # Run tests
```

## Architecture

The SDK uses plain `fetch` for HTTP requests (no external dependencies). This keeps the package lightweight and portable.

### Key Components

1. **Types** - Exported interfaces for API request/response shapes
2. **AgentsClientImpl** - Private class implementing the client
3. **createClient()** - Factory function that returns the client instance

### Base URL Resolution

The SDK resolves the API base URL in this order:
1. `baseUrl` option passed to `createClient()`
2. `NEXT_PUBLIC_APP_URL` environment variable (for local development)
3. Default: `https://agentsapi.io`

### Response Format

All methods return `ApiResponse<T>`:
```typescript
interface ApiResponse<T> {
  data: T | null      // Response data on success
  error: { error: string } | null  // Error on failure
  status: number      // HTTP status code
}
```

## Sync with API

**IMPORTANT:** This SDK must stay in sync with the v1 API (`lib/api/routes/v1.ts`).

When v1 endpoints change:
1. Update types in `src/index.ts`
2. Update/add client methods
3. Update tests in `__tests__/client.test.ts`
4. Update `README.md` documentation
5. Run `bun run build && bun test`

See `lib/api/CLAUDE.md` for the full API documentation maintenance guide.
