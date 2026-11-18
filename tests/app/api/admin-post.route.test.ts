import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getPostById: vi.fn(),
  getPostBySlug: vi.fn(),
  rememberPostSlugAlias: vi.fn(),
  updatePost: vi.fn(),
  deletePost: vi.fn(),
  ensureAuthenticatedRequest: vi.fn(),
  invalidatePublicContentCache: vi.fn(),
  enqueueBackgroundJob: vi.fn(),
  getRouteContextWithDb: vi.fn(),
  parseJsonBody: vi.fn(),
  localizeRemotePostImages: vi.fn(),
  recordLocalizedRemoteAssets: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  deletePost: mocks.deletePost,
  getPostById: mocks.getPostById,
  getPostBySlug: mocks.getPostBySlug,
  rememberPostSlugAlias: mocks.rememberPostSlugAlias,
  updatePost: mocks.updatePost,
}))

vi.mock('@/lib/cache', () => ({
  invalidatePublicContentCache: mocks.invalidatePublicContentCache,
}))

vi.mock('@/lib/background-jobs', () => ({
  enqueueBackgroundJob: mocks.enqueueBackgroundJob,
}))

vi.mock('@/lib/server/route-helpers', () => ({
  ensureAuthenticatedRequest: mocks.ensureAuthenticatedRequest,
  getRouteContextWithDb: mocks.getRouteContextWithDb,
  jsonError: (message: string, status = 500) => Response.json({ error: message }, { status }),
  jsonOk: (data: unknown, status = 200) => Response.json(data, { status }),
  parseJsonBody: mocks.parseJsonBody,
}))

vi.mock('@/lib/remote-image-localization', () => ({
  localizeRemotePostImages: mocks.localizeRemotePostImages,
  recordLocalizedRemoteAssets: mocks.recordLocalizedRemoteAssets,
  remoteImageResponse: (report: { found: number }) => report.found > 0 ? { remote_images: report } : {},
}))

import { PUT } from '@/app/api/admin/posts/[slug]/route'

describe('/api/admin/posts/[slug] route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.ensureAuthenticatedRequest.mockResolvedValue(null)
    mocks.getRouteContextWithDb.mockResolvedValue({
      ok: true,
      env: { CACHE: {} },
      db: { kind: 'db' },
      ctx: { waitUntil: vi.fn() },
    })
    mocks.getPostBySlug.mockResolvedValue({ id: 7, slug: 'old-slug' })
    mocks.getPostById.mockResolvedValue({ id: 7, slug: 'old-slug' })
    mocks.rememberPostSlugAlias.mockResolvedValue(undefined)
    mocks.parseJsonBody.mockResolvedValue({
      slug: 'next_slug',
      title: '文章标题',
      content: '更新后的正文',
      html: '<p>更新后的正文</p>',
      description: '   ',
      tags: ['AI', '写作'],
      cover_image: '/covers/dashboard.webp',
    })
    mocks.invalidatePublicContentCache.mockRejectedValue(new Error('cache down'))
    mocks.enqueueBackgroundJob.mockResolvedValue(undefined)
    mocks.localizeRemotePostImages.mockImplementation(async (input) => ({
      content: input.content,
      html: input.html,
      coverImage: input.coverImage,
      assets: [],
      report: { found: 0, localized: 0, reused: 0, skipped: 0, failures: [], replacements: {} },
    }))
    mocks.recordLocalizedRemoteAssets.mockResolvedValue(undefined)
  })

  it('updates a post, falls back description, and tolerates cache invalidation failures', async () => {
    const response = await PUT({} as never, {
      params: Promise.resolve({ slug: 'old-slug' }),
    })
    const body = await response.json()

    expect(mocks.updatePost).toHaveBeenCalledWith(
      { kind: 'db' },
      7,
      expect.objectContaining({
        slug: 'next_slug',
        title: '文章标题',
        content: '更新后的正文',
        description: '更新后的正文',
        tags: ['AI', '写作'],
        cover_image: '/covers/dashboard.webp',
      }),
    )
    expect(mocks.enqueueBackgroundJob).toHaveBeenCalledTimes(1)
    expect(mocks.rememberPostSlugAlias).toHaveBeenCalledWith(
      { kind: 'db' },
      7,
      'old-slug',
      'next_slug',
    )
    expect(body).toEqual({ success: true, id: 7, slug: 'next_slug' })
  })

  it('does not clear the existing description for partial quick updates', async () => {
    mocks.parseJsonBody.mockResolvedValue({ is_pinned: 1 })
    mocks.getPostBySlug.mockResolvedValue({
      id: 7,
      slug: 'old-slug',
      content: '已有正文',
      description: '已有摘要',
    })

    const response = await PUT({} as never, {
      params: Promise.resolve({ slug: 'old-slug' }),
    })
    const body = await response.json()

    expect(mocks.updatePost).toHaveBeenCalledWith(
      { kind: 'db' },
      7,
      { is_pinned: 1 },
    )
    expect(body).toEqual({ success: true, id: 7, slug: 'old-slug' })
  })

  it('persists localized image URLs through the admin editor route', async () => {
    const localizedUrl = '/api/images/image/remote/dashboard123'
    mocks.parseJsonBody.mockResolvedValue({
      content: '![图](https://cdn.example.com/image.png)',
      html: '<img src="https://cdn.example.com/image.png">',
    })
    mocks.localizeRemotePostImages.mockResolvedValue({
      content: `![图](${localizedUrl})`,
      html: `<img src="${localizedUrl}">`,
      coverImage: undefined,
      assets: [{ url: localizedUrl }],
      report: {
        found: 1,
        localized: 1,
        reused: 0,
        skipped: 0,
        failures: [],
        replacements: { 'https://cdn.example.com/image.png': localizedUrl },
      },
    })

    const response = await PUT({} as never, {
      params: Promise.resolve({ slug: 'old-slug' }),
    })
    const body = await response.json()

    expect(mocks.updatePost).toHaveBeenCalledWith(
      { kind: 'db' },
      7,
      expect.objectContaining({
        content: `![图](${localizedUrl})`,
        html: `<img src="${localizedUrl}">`,
      }),
    )
    expect(mocks.recordLocalizedRemoteAssets).toHaveBeenCalledWith(
      { kind: 'db' },
      [{ url: localizedUrl }],
      { postId: 7, slug: 'old-slug' },
    )
    expect(body.remote_images).toEqual(expect.objectContaining({ found: 1, localized: 1 }))
  })

  it('uses the stable post id when the route slug is stale after a custom slug edit', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      id: 100,
      slug: 'why-effort-isnt-enough',
      title: '更新标题',
      content: '更新正文',
    })
    mocks.getPostById.mockResolvedValue({
      id: 100,
      slug: 'why-effort-isnt-enough',
      content: '已有正文',
    })

    const response = await PUT({} as never, {
      params: Promise.resolve({ slug: '2026-05-02-dh5wth' }),
    })
    const body = await response.json()

    expect(mocks.getPostById).toHaveBeenCalledWith({ kind: 'db' }, 100)
    expect(mocks.getPostBySlug).not.toHaveBeenCalled()
    expect(mocks.updatePost).toHaveBeenCalledWith(
      { kind: 'db' },
      100,
      expect.objectContaining({
        slug: 'why-effort-isnt-enough',
        title: '更新标题',
        content: '更新正文',
      }),
    )
    expect(mocks.rememberPostSlugAlias).toHaveBeenCalledWith(
      { kind: 'db' },
      100,
      '2026-05-02-dh5wth',
      'why-effort-isnt-enough',
    )
    expect(body).toEqual({ success: true, id: 100, slug: 'why-effort-isnt-enough' })
  })

  it('allows the shared auth helper to reject unauthorized updates', async () => {
    mocks.ensureAuthenticatedRequest.mockResolvedValue(Response.json({ error: 'Unauthorized' }, { status: 401 }))

    const response = await PUT({} as never, {
      params: Promise.resolve({ slug: 'old-slug' }),
    })

    expect(response.status).toBe(401)
    expect(mocks.getPostBySlug).not.toHaveBeenCalled()
    expect(mocks.getPostById).not.toHaveBeenCalled()
    expect(mocks.updatePost).not.toHaveBeenCalled()
  })
})
