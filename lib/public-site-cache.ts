import { getPublicContentCacheNamespace, getVersionedCached } from '@/lib/cache'
import { getSettings } from '@/lib/db'

const PUBLIC_SITE_CACHE_TTL = 300

function normalizeKeys(keys: string[]) {
  return Array.from(
    new Set(keys.map((key) => key.trim()).filter(Boolean)),
  ).sort()
}

function emptySettings(keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, null])) as Record<
    string,
    string | null
  >
}

export async function getCachedPublicData<T>(
  env: Partial<CloudflareEnv> | null | undefined,
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = PUBLIC_SITE_CACHE_TTL,
): Promise<T> {
  const cache = getPublicContentCacheNamespace(env)
  if (!cache) return fetcher()

  try {
    return await getVersionedCached(cache, key, fetcher, ttl)
  } catch {
    return fetcher()
  }
}

export async function getPublicSettings(
  env: Partial<CloudflareEnv> | null | undefined,
  keys: string[],
  ttl: number = PUBLIC_SITE_CACHE_TTL,
): Promise<Record<string, string | null>> {
  const normalizedKeys = normalizeKeys(keys)
  if (normalizedKeys.length === 0) return {}
  if (!env?.DB) return emptySettings(normalizedKeys)

  return getCachedPublicData(
    env,
    `settings:${normalizedKeys.join(',')}`,
    () => getSettings(env.DB as D1Database, normalizedKeys),
    ttl,
  )
}
