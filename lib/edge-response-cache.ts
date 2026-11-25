const EDGE_CACHE_HEADER = 'x-qmblog-edge-cache'
const EDGE_CACHE_TTL_SECONDS = 60

const PUBLIC_API_PATHS = new Set([
  '/api/settings/appearance',
  '/api/settings/font',
])

const BYPASS_PREFIXES = [
  '/_next/',
  '/dashboard',
  '/editor',
  '/api/',
  '/images/',
]

const BYPASS_EXACT_PATHS = new Set([
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
  '/feed.xml',
])

type WorkerContext = {
  waitUntil?: (promise: Promise<unknown>) => void
}

type FetchHandler<Env> = (
  request: Request,
  env: Env,
  ctx: WorkerContext,
) => Promise<Response>

type CloudflareCacheStorage = CacheStorage & {
  default?: Cache
}

function getDefaultEdgeCache() {
  return (globalThis.caches as CloudflareCacheStorage | undefined)?.default
}

function hasAuthState(request: Request) {
  return Boolean(
    request.headers.get('authorization') ||
      request.headers.get('cookie') ||
      request.headers.get('next-action'),
  )
}

function hasOnlySearchParams(url: URL, allowed: Set<string>) {
  for (const key of url.searchParams.keys()) {
    if (!allowed.has(key)) return false
  }
  return true
}

function isSingleSlugPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length !== 1) return false

  const [slug] = segments
  return Boolean(slug) && !slug.includes('.')
}

function isCategoryPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  return (
    segments.length === 2 && segments[0] === 'category' && Boolean(segments[1])
  )
}

export function isPublicEdgeCacheableRequest(request: Request) {
  if (request.method !== 'GET') return false
  if (hasAuthState(request)) return false

  const url = new URL(request.url)
  const { pathname } = url

  if (PUBLIC_API_PATHS.has(pathname)) {
    return hasOnlySearchParams(url, new Set())
  }

  if (BYPASS_EXACT_PATHS.has(pathname)) return false
  if (BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix)))
    return false

  const pageParams = new Set(['page', '_rsc'])
  const rscParams = new Set(['_rsc'])

  if (pathname === '/') {
    return hasOnlySearchParams(url, pageParams)
  }

  if (isCategoryPath(pathname)) {
    return hasOnlySearchParams(url, pageParams)
  }

  if (isSingleSlugPath(pathname)) {
    return hasOnlySearchParams(url, rscParams)
  }

  return false
}

function hashHeader(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

export function buildPublicEdgeCacheKey(request: Request) {
  const cacheUrl = new URL(request.url)
  const rsc = request.headers.get('rsc')

  if (rsc === '1') {
    cacheUrl.searchParams.set('__qm_rsc', '1')

    const routerState = request.headers.get('next-router-state-tree')
    if (routerState) {
      cacheUrl.searchParams.set('__qm_tree', hashHeader(routerState))
    }

    if (request.headers.get('next-router-prefetch')) {
      cacheUrl.searchParams.set('__qm_prefetch', '1')
    }
  }

  return new Request(cacheUrl.toString(), { method: 'GET' })
}

export function isPublicEdgeCacheableResponse(response: Response) {
  if (response.status !== 200) return false
  if (response.headers.has('set-cookie')) return false

  const contentType = response.headers.get('content-type') || ''
  return (
    contentType.includes('text/html') ||
    contentType.includes('text/x-component') ||
    contentType.includes('application/json')
  )
}

function cloneWithCacheHeaders(
  response: Response,
  cacheState: 'hit' | 'miss' | 'bypass',
) {
  const next = new Response(response.body, response)
  next.headers.set(EDGE_CACHE_HEADER, cacheState)
  return next
}

function cloneForStorage(response: Response) {
  const cached = new Response(response.body, response)
  cached.headers.set(
    'Cache-Control',
    `public, max-age=${EDGE_CACHE_TTL_SECONDS}`,
  )
  cached.headers.set(EDGE_CACHE_HEADER, 'stored')
  cached.headers.delete('Set-Cookie')
  return cached
}

export async function respondWithPublicEdgeCache<Env>(
  request: Request,
  env: Env,
  ctx: WorkerContext,
  fetchHandler: FetchHandler<Env>,
) {
  const cache = getDefaultEdgeCache()
  if (!isPublicEdgeCacheableRequest(request) || !cache) {
    return fetchHandler(request, env, ctx)
  }

  const cacheKey = buildPublicEdgeCacheKey(request)

  try {
    const cached = await cache.match(cacheKey)
    if (cached) {
      return cloneWithCacheHeaders(cached, 'hit')
    }
  } catch {
    return fetchHandler(request, env, ctx)
  }

  const response = await fetchHandler(request, env, ctx)
  if (!isPublicEdgeCacheableResponse(response)) {
    return cloneWithCacheHeaders(response, 'bypass')
  }

  const storageResponse = cloneForStorage(response.clone())
  const putPromise = cache.put(cacheKey, storageResponse).catch(() => undefined)
  if (ctx.waitUntil) {
    ctx.waitUntil(putPromise)
  }

  return cloneWithCacheHeaders(response, 'miss')
}
