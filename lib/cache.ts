// Cloudflare KV 缓存层
const CACHE_VERSION_MEMORY_TTL_MS = 10_000

type CacheVersionEntry = {
  value: string | null
  expiresAt: number
  inflight?: Promise<string | null>
}

const cacheVersionMemory = new WeakMap<KVNamespace, CacheVersionEntry>()

export function getCacheNamespace(
  env?: Partial<CloudflareEnv> | null,
): KVNamespace | undefined {
  return env?.CACHE ?? env?.KV
}

function readFlag(value: string | undefined): boolean {
  return (
    typeof value === 'string' &&
    ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
  )
}

export function shouldUsePublicContentCache(
  env?: Partial<CloudflareEnv> | null,
): boolean {
  const cache = getCacheNamespace(env)
  if (!cache) return false

  if (process.env.NODE_ENV === 'production') {
    return true
  }

  return readFlag(process.env.ENABLE_PUBLIC_CACHE_IN_DEV)
}

export function getPublicContentCacheNamespace(
  env?: Partial<CloudflareEnv> | null,
): KVNamespace | undefined {
  return shouldUsePublicContentCache(env) ? getCacheNamespace(env) : undefined
}

export async function invalidatePublicContentCache(
  env?: Partial<CloudflareEnv> | null,
): Promise<boolean> {
  const cache = getPublicContentCacheNamespace(env)
  if (!cache) return false

  await invalidateCache(cache)
  return true
}

export async function getCached<T>(
  kv: KVNamespace,
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600,
): Promise<T> {
  // 尝试从 KV 读取
  const cached = await kv.get(key, 'json')
  if (cached) return cached as T

  // 缓存未命中，执行查询
  const data = await fetcher()

  // 写入 KV（真正异步，不阻塞响应；写入失败不影响页面）
  kv.put(key, JSON.stringify(data), { expirationTtl: ttl }).catch(() => {})

  return data
}

export async function getVersionedCached<T>(
  kv: KVNamespace,
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600,
): Promise<T> {
  const cacheKey = await getCacheKey(kv, key)
  return getCached(kv, cacheKey, fetcher, ttl)
}

// 清除缓存（通过版本号机制）
export async function invalidateCache(kv: KVNamespace): Promise<void> {
  const version = await kv.get('cache:version')
  const newVersion = String(Number(version || 0) + 1)
  await kv.put('cache:version', newVersion)
  cacheVersionMemory.set(kv, {
    value: newVersion,
    expiresAt: Date.now() + CACHE_VERSION_MEMORY_TTL_MS,
  })
}

// 获取带版本的缓存 key
export async function getCacheKey(
  kv: KVNamespace,
  key: string,
): Promise<string> {
  const version = await getCacheVersion(kv)
  return version ? `${key}:v${version}` : key
}

async function getCacheVersion(kv: KVNamespace): Promise<string | null> {
  const now = Date.now()
  const cached = cacheVersionMemory.get(kv)

  if (cached && cached.expiresAt > now) {
    if (cached.inflight) return cached.inflight
    return cached.value
  }

  if (cached?.inflight) return cached.inflight

  const inflight = kv
    .get('cache:version')
    .then((value) => {
      cacheVersionMemory.set(kv, {
        value,
        expiresAt: Date.now() + CACHE_VERSION_MEMORY_TTL_MS,
      })
      return value
    })
    .catch(() => {
      cacheVersionMemory.delete(kv)
      return null
    })

  cacheVersionMemory.set(kv, {
    value: cached?.value ?? null,
    expiresAt: now,
    inflight,
  })

  return inflight
}

// 直接删除指定 key
export async function deleteCache(kv: KVNamespace, key: string): Promise<void> {
  await kv.delete(key)
}
