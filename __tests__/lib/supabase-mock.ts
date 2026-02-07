import { mock } from "bun:test"

export const mockAuth = mock(() =>
  Promise.resolve({ userId: null, orgId: null, orgRole: null })
)
export const mockClerkClient = mock(() =>
  Promise.resolve({
    organizations: {
      getOrganization: mock(() => Promise.resolve({ name: "Test Org" })),
    },
  })
)

mock.module("@clerk/nextjs/server", () => ({
  auth: mockAuth,
  clerkClient: mockClerkClient,
}))

type ChainableResult = {
  data: unknown
  error: unknown
  count?: number | null
}

let currentFromImpl: (table: string) => unknown = () => ({})
let currentRpcImpl: (fn: string, params: unknown) => Promise<ChainableResult> = () =>
  Promise.resolve({ data: null, error: null })

export const mockFrom = mock((table: string) => currentFromImpl(table))
export const mockRpc = mock((fn: string, params: unknown) => currentRpcImpl(fn, params))

export function setMockFromImplementation(impl: (table: string) => unknown) {
  currentFromImpl = impl
}

export function setMockRpcImplementation(
  impl: (fn: string, params: unknown) => Promise<ChainableResult>
) {
  currentRpcImpl = impl
}

export function createChainableMock(resolvedValue: ChainableResult) {
  const chain: Record<string, unknown> = {
    select: mock(() => chain),
    insert: mock(() => chain),
    update: mock(() => chain),
    delete: mock(() => chain),
    upsert: mock(() => chain),
    eq: mock(() => chain),
    neq: mock(() => chain),
    in: mock(() => chain),
    is: mock(() => chain),
    or: mock(() => chain),
    not: mock(() => chain),
    contains: mock(() => chain),
    order: mock(() => chain),
    limit: mock(() => chain),
    range: mock(() => chain),
    single: mock(() => chain),
    maybeSingle: mock(() => chain),
    then: (resolve: (v: unknown) => void) => resolve(resolvedValue),
  }
  return chain
}

export function resetSupabaseMocks() {
  mockFrom.mockClear()
  mockRpc.mockClear()
  currentFromImpl = () => ({})
  currentRpcImpl = () => Promise.resolve({ data: null, error: null })
}

export function resetClerkMocks() {
  mockAuth.mockClear()
  mockAuth.mockImplementation(() =>
    Promise.resolve({ userId: null, orgId: null, orgRole: null })
  )
  mockClerkClient.mockClear()
  mockClerkClient.mockImplementation(() =>
    Promise.resolve({
      organizations: {
        getOrganization: mock(() => Promise.resolve({ name: "Test Org" })),
      },
    })
  )
}

export function resetAllMocks() {
  resetSupabaseMocks()
  resetClerkMocks()
}

mock.module("@/lib/db/client", () => ({
  supabase: () => ({
    from: (table: string) => mockFrom(table),
    rpc: (fn: string, params: unknown) => mockRpc(fn, params),
  }),
}))
