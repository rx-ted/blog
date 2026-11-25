import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  ensureAuthenticatedRequest: vi.fn(),
  getRouteEnvWithDb: vi.fn(),
  parseJsonBody: vi.fn(),
  getMediaAssetByUrl: vi.fn(),
  linkMediaAssetToArticle: vi.fn(),
  listMediaAssets: vi.fn(),
}))

vi.mock('@/lib/server/route-helpers', () => ({
  ensureAuthenticatedRequest: mocks.ensureAuthenticatedRequest,
  getRouteEnvWithDb: mocks.getRouteEnvWithDb,
  jsonError: (message: string, status = 500) =>
    Response.json({ error: message }, { status }),
  jsonOk: (payload: unknown, status = 200) =>
    Response.json(payload, { status }),
  parseJsonBody: mocks.parseJsonBody,
}))

vi.mock('@/lib/repositories/media-assets', () => ({
  getMediaAssetByUrl: mocks.getMediaAssetByUrl,
  linkMediaAssetToArticle: mocks.linkMediaAssetToArticle,
  listMediaAssets: mocks.listMediaAssets,
}))

import { GET, POST } from '@/app/api/editor/media-assets/route'

describe('/api/editor/media-assets route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getRouteEnvWithDb.mockResolvedValue({
      ok: true,
      db: { kind: 'db' },
      env: {},
    })
    mocks.ensureAuthenticatedRequest.mockResolvedValue(null)
    mocks.listMediaAssets.mockResolvedValue([
      {
        id: 1,
        url: '/api/images/image%2Fasset.webp',
        alt: '资产图片',
      },
    ])
    mocks.linkMediaAssetToArticle.mockResolvedValue(undefined)
  })

  it('lists article scoped image assets for authenticated editor requests', async () => {
    const response = await GET({
      nextUrl: new URL(
        'http://test.local/api/editor/media-assets?scope=article&postId=42&slug=hello&limit=200&offset=5',
      ),
    } as never)
    const body = await response.json()

    expect(mocks.ensureAuthenticatedRequest).toHaveBeenCalledWith(
      expect.anything(),
      { kind: 'db' },
    )
    expect(mocks.listMediaAssets).toHaveBeenCalledWith(
      { kind: 'db' },
      {
        scope: 'article',
        postId: 42,
        slug: 'hello',
        source: null,
        query: null,
        limit: 200,
        offset: 5,
      },
    )
    expect(body).toEqual({
      assets: [
        {
          id: 1,
          url: '/api/images/image%2Fasset.webp',
          alt: '资产图片',
        },
      ],
    })
  })

  it('links an existing asset by id to the current article', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      assetId: 7,
      postId: 42,
      slug: 'hello',
      role: 'section',
    })

    const response = await POST(
      new Request('http://test.local/api/editor/media-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }) as never,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(mocks.linkMediaAssetToArticle).toHaveBeenCalledWith(
      { kind: 'db' },
      {
        assetId: 7,
        postId: 42,
        slug: 'hello',
        role: 'section',
      },
    )
  })

  it('resolves an asset id from URL before linking', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      url: '/api/images/image%2Fasset.webp',
      postId: 42,
    })
    mocks.getMediaAssetByUrl.mockResolvedValue({ id: 9 })

    const response = await POST(
      new Request('http://test.local/api/editor/media-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }) as never,
    )

    expect(response.status).toBe(200)
    expect(mocks.getMediaAssetByUrl).toHaveBeenCalledWith(
      { kind: 'db' },
      '/api/images/image%2Fasset.webp',
    )
    expect(mocks.linkMediaAssetToArticle).toHaveBeenCalledWith(
      { kind: 'db' },
      expect.objectContaining({
        assetId: 9,
        postId: 42,
        role: 'inline',
      }),
    )
  })

  it('rejects link requests without a known asset id', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      url: '/api/images/missing.webp',
      postId: 42,
    })
    mocks.getMediaAssetByUrl.mockResolvedValue(null)

    const response = await POST(
      new Request('http://test.local/api/editor/media-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }) as never,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: '缺少有效的 assetId',
    })
    expect(mocks.linkMediaAssetToArticle).not.toHaveBeenCalled()
  })
})
