import type { Principal, UserPrincipal, ApiKeyPrincipal } from "@/lib/auth/types"

export const mockUserPrincipal: UserPrincipal = {
  kind: "user",
  tenantId: "test-tenant-id",
  userId: "test-user-id",
  orgId: "test-org-id",
  orgRole: "org:admin",
  scopes: ["jobs:create", "jobs:read", "jobs:cancel", "keys:read", "keys:write"],
}

export const mockApiKeyPrincipal: ApiKeyPrincipal = {
  kind: "api_key",
  tenantId: "test-tenant-id",
  keyId: "test-key-id",
  scopes: ["jobs:create", "jobs:read"],
}

export const mockAnonPrincipal: Principal = {
  kind: "anon",
}

export function createMockSupabaseClient() {
  const mockData: Record<string, unknown[]> = {
    tenants: [],
    api_keys: [],
    jobs: [],
    audit_logs: [],
  }

  const createQuery = (table: string) => {
    const filters: Record<string, unknown> = {}
    let insertData: unknown = null
    let updateData: unknown = null

    const query = {
      select: (_cols: string = "*") => {
        return query
      },
      insert: (data: unknown) => {
        insertData = data
        return query
      },
      update: (data: unknown) => {
        updateData = data
        return query
      },
      eq: (col: string, val: unknown) => {
        filters[col] = val
        return query
      },
      is: (col: string, val: unknown) => {
        filters[`${col}_is`] = val
        return query
      },
      order: (_col: string, _opts: { ascending: boolean }) => {
        return query
      },
      limit: (_count: number) => {
        return query
      },
      range: (_start: number, _end: number) => {
        return query
      },
      single: async () => {
        if (insertData) {
          const newItem = {
            id: `test-${table}-${Date.now()}`,
            created_at: new Date().toISOString(),
            ...(insertData as object),
          }
          mockData[table].push(newItem)
          return { data: newItem, error: null }
        }
        if (updateData) {
          return { data: { ...updateData, id: filters.id }, error: null }
        }
        const item = mockData[table].find((item) => {
          return Object.entries(filters).every(([key, val]) => {
            if (key.endsWith("_is")) {
              const actualKey = key.slice(0, -3)
              return (item as Record<string, unknown>)[actualKey] === val
            }
            return (item as Record<string, unknown>)[key] === val
          })
        })
        return { data: item || null, error: null }
      },
    }

    return query
  }

  return {
    from: (table: string) => createQuery(table),
    _mockData: mockData,
  }
}

export function mockRequest(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: unknown } = {}
) {
  const init: RequestInit = {
    method: options.method || "GET",
    headers: options.headers || {},
  }

  if (options.body) {
    init.body = JSON.stringify(options.body)
    init.headers = {
      ...init.headers,
      "Content-Type": "application/json",
    }
  }

  return new Request(url, init)
}
