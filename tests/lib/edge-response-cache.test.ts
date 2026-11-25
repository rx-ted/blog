import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildPublicEdgeCacheKey,
  isPublicEdgeCacheableRequest,
  isPublicEdgeCacheableResponse,
  respondWithPublicEdgeCache,
} from '@/lib/edge-response-cache'

function request(path: string, init?: RequestInit) {
  return new Request(`https://blog.19981204.xyz${path}`, init)
}

describe('edge response cache helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('allows anonymous public document and RSC routes', () => {
    expect(isPublicEdgeCacheableRequest(request('/'))).toBe(true)
    expect(isPublicEdgeCacheableRequest(request('/?page=2'))).toBe(true)
    expect(
      isPublicEdgeCacheableRequest(request('/category/ai-news?page=1')),
    ).toBe(true)
    expect(
      isPublicEdgeCacheableRequest(
        request('/google-opens-okf-knowledge-format-for-ai?_rsc=abc'),
      ),
    ).toBe(true)
  })

  it('bypasses authenticated, private, write, and unknown file requests', () => {
    expect(
      isPublicEdgeCacheableRequest(
        request('/', { headers: { cookie: 'qmblog_admin=1' } }),
      ),
    ).toBe(false)
    expect(
      isPublicEdgeCacheableRequest(
        request('/', { headers: { authorization: 'Bearer token' } }),
      ),
    ).toBe(false)
    expect(isPublicEdgeCacheableRequest(request('/', { method: 'POST' }))).toBe(
      false,
    )
    expect(isPublicEdgeCacheableRequest(request('/dashboard'))).toBe(false)
    expect(isPublicEdgeCacheableRequest(request('/editor'))).toBe(false)
    expect(isPublicEdgeCacheableRequest(request('/api/admin/session'))).toBe(
      false,
    )
    expect(isPublicEdgeCacheableRequest(request('/favicon.ico'))).toBe(false)
    expect(isPublicEdgeCacheableRequest(request('/article?pwd=secret'))).toBe(
      false,
    )
  })

  it('allows only selected public API routes', () => {
    expect(
      isPublicEdgeCacheableRequest(request('/api/settings/appearance')),
    ).toBe(true)
    expect(isPublicEdgeCacheableRequest(request('/api/settings/font'))).toBe(
      true,
    )
    expect(isPublicEdgeCacheableRequest(request('/api/search?q=test'))).toBe(
      false,
    )
  })

  it('varies RSC cache keys by router state headers', () => {
    const left = buildPublicEdgeCacheKey(
      request('/post?_rsc=abc', {
        headers: {
          rsc: '1',
          'next-router-state-tree': 'left',
        },
      }),
    )
    const right = buildPublicEdgeCacheKey(
      request('/post?_rsc=abc', {
        headers: {
          rsc: '1',
          'next-router-state-tree': 'right',
        },
      }),
    )

    expect(left.url).not.toBe(right.url)
    expect(left.url).toContain('__qm_rsc=1')
    expect(left.url).toContain('__qm_tree=')
  })

  it('stores only safe successful public response types', () => {
    expect(
      isPublicEdgeCacheableResponse(
        new Response('<html />', {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        }),
      ),
    ).toBe(true)
    expect(
      isPublicEdgeCacheableResponse(
        new Response('{}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    ).toBe(true)
    expect(
      isPublicEdgeCacheableResponse(
        new Response('nope', {
          status: 404,
          headers: { 'content-type': 'text/html' },
        }),
      ),
    ).toBe(false)
    expect(
      isPublicEdgeCacheableResponse(
        new Response('<html />', {
          status: 200,
          headers: { 'content-type': 'text/html', 'set-cookie': 'a=b' },
        }),
      ),
    ).toBe(false)
  })

  it('serves cacheable public responses from the edge cache after a miss', async () => {
    const store = new Map<string, Response>()
    const cache = {
      match: vi.fn(async (key: Request) => store.get(key.url) ?? null),
      put: vi.fn(async (key: Request, response: Response) => {
        store.set(key.url, response)
      }),
    }
    const waitUntil = vi.fn()
    const fetchHandler = vi.fn(
      async () =>
        new Response('ok', {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        }),
    )

    vi.stubGlobal('caches', { default: cache })

    const first = await respondWithPublicEdgeCache(
      request('/'),
      {},
      { waitUntil },
      fetchHandler,
    )
    expect(first.headers.get('x-qmblog-edge-cache')).toBe('miss')
    expect(fetchHandler).toHaveBeenCalledTimes(1)
    expect(cache.put).toHaveBeenCalledTimes(1)

    const second = await respondWithPublicEdgeCache(
      request('/'),
      {},
      { waitUntil },
      fetchHandler,
    )
    expect(second.headers.get('x-qmblog-edge-cache')).toBe('hit')
    expect(await second.text()).toBe('ok')
    expect(fetchHandler).toHaveBeenCalledTimes(1)
  })
})
