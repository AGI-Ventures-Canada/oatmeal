const DEFAULT_TTL_MS = 10 * 60 * 1000

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

export function ttlCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS
): Promise<T> {
  const existing = store.get(key) as CacheEntry<T> | undefined
  if (existing && existing.expiresAt > Date.now()) {
    return Promise.resolve(existing.value)
  }

  return fn().then((value) => {
    store.set(key, { value, expiresAt: Date.now() + ttlMs })
    return value
  })
}
