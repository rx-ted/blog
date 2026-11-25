import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createPost: vi.fn(),
  deletePost: vi.fn(),
  getCategories: vi.fn(),
  getPostById: vi.fn(),
  getPostBySlug: vi.fn(),
  getPosts: vi.fn(),
  rememberPostSlugAlias: vi.fn(),
  updatePost: vi.fn(),
  updatePostBySlug: vi.fn(),
  ensureAuthenticatedRequest: vi.fn(),
  getRouteContextWithDb: vi.fn(),
  parseJsonBody: vi.fn(),
  invalidatePublicContentCache: vi.fn(),
  enqueueBackgroundJob: vi.fn(),
  localizeRemotePostImages: vi.fn(),
  recordLocalizedRemoteAssets: vi.fn(),
  nanoid: vi.fn(() => 'abc123'),
}))

vi.mock('@/lib/db', () => ({
  createPost: mocks.createPost,
  deletePost: mocks.deletePost,
  getCategories: mocks.getCategories,
  getPostById: mocks.getPostById,
  getPostBySlug: mocks.getPostBySlug,
  getPosts: mocks.getPosts,
  rememberPostSlugAlias: mocks.rememberPostSlugAlias,
  updatePost: mocks.updatePost,
  updatePostBySlug: mocks.updatePostBySlug,
}))

vi.mock('@/lib/server/route-helpers', () => ({
  ensureAuthenticatedRequest: mocks.ensureAuthenticatedRequest,
  getRouteContextWithDb: mocks.getRouteContextWithDb,
  jsonError: (message: string, status = 500) =>
    Response.json({ error: message }, { status }),
  jsonOk: (data: unknown, status = 200) => Response.json(data, { status }),
  parseJsonBody: mocks.parseJsonBody,
}))

vi.mock('@/lib/cache', () => ({
  invalidatePublicContentCache: mocks.invalidatePublicContentCache,
}))

vi.mock('@/lib/background-jobs', () => ({
  enqueueBackgroundJob: mocks.enqueueBackgroundJob,
}))

vi.mock('@/lib/remote-image-localization', () => ({
  localizeRemotePostImages: mocks.localizeRemotePostImages,
  recordLocalizedRemoteAssets: mocks.recordLocalizedRemoteAssets,
  remoteImageResponse: (report: { found: number }) =>
    report.found > 0 ? { remote_images: report } : {},
}))

vi.mock('nanoid', () => ({
  nanoid: mocks.nanoid,
}))

import { DELETE, GET, PATCH, POST, PUT } from '@/app/api/posts/route'

describe('/api/posts route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getRouteContextWithDb.mockResolvedValue({
      ok: true,
      env: { AI_QUEUE: {} },
      db: { kind: 'db' },
      ctx: { waitUntil: vi.fn() },
    })
    mocks.ensureAuthenticatedRequest.mockResolvedValue(null)
    mocks.invalidatePublicContentCache.mockResolvedValue(undefined)
    mocks.enqueueBackgroundJob.mockResolvedValue(undefined)
    mocks.localizeRemotePostImages.mockImplementation(async (input) => ({
      content: input.content,
      html: input.html,
      coverImage: input.coverImage,
      assets: [],
      report: {
        found: 0,
        localized: 0,
        reused: 0,
        skipped: 0,
        failures: [],
        replacements: {},
      },
    }))
    mocks.recordLocalizedRemoteAssets.mockResolvedValue(undefined)
    mocks.getPostById.mockResolvedValue({ id: 42, slug: 'old-slug' })
    mocks.getPostBySlug.mockResolvedValue({
      id: 7,
      slug: 'old-slug',
      title: '旧标题',
      content: '旧正文',
      html: '<p>旧正文</p>',
      category: 'AI',
      tags: ['旧标签'],
      description: '旧摘要',
      cover_image: null,
    })
    mocks.getPosts.mockResolvedValue([
      { id: 7, slug: 'old-slug', title: '旧标题' },
    ])
    mocks.getCategories.mockResolvedValue([
      { name: '未分类', slug: 'uncategorized', post_count: 0 },
      { name: 'AI', slug: 'ai', post_count: 0 },
      { name: 'AI资讯', slug: 'ai-news', post_count: 0 },
      { name: '论文学习', slug: 'paper', post_count: 0 },
    ])
    mocks.rememberPostSlugAlias.mockResolvedValue(undefined)
    mocks.updatePost.mockResolvedValue(undefined)
    mocks.updatePostBySlug.mockResolvedValue(undefined)
    mocks.deletePost.mockResolvedValue(undefined)
  })

  it('creates a post with normalized payload fields and enqueues follow-up jobs', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      title: '  Ask AI 标题  ',
      content: '  正文内容  ',
      html: '<p>正文</p>',
      category: '  AI  ',
      tags: [
        ' AI ',
        '',
        '提示词',
        '编辑器',
        '产品',
        '设计',
        '测试',
        '额外',
        '更多',
        '仍然',
        '超出',
      ],
      description: '',
      cover_image: ' /covers/test.webp ',
      slug: 'custom_slug',
      status: 'draft',
      password: ' secret ',
      is_hidden: 1,
    })
    mocks.createPost.mockResolvedValue(42)

    const response = await POST({} as never)
    const body = await response.json()

    expect(mocks.createPost).toHaveBeenCalledWith(
      { kind: 'db' },
      expect.objectContaining({
        slug: 'custom_slug',
        title: 'Ask AI 标题',
        content: '正文内容',
        html: '<p>正文</p>',
        category: 'AI',
        status: 'draft',
        password: 'secret',
        is_hidden: 1,
        description: '正文内容',
        tags: [
          'AI',
          '提示词',
          '编辑器',
          '产品',
          '设计',
          '测试',
          '额外',
          '更多',
          '仍然',
          '超出',
        ],
        cover_image: '/covers/test.webp',
      }),
    )
    expect(mocks.invalidatePublicContentCache).toHaveBeenCalled()
    expect(mocks.enqueueBackgroundJob).toHaveBeenCalledTimes(2)
    expect(body).toEqual(
      expect.objectContaining({
        success: true,
        id: 42,
        slug: 'custom_slug',
        category: 'AI',
      }),
    )
  })

  it('stores localized remote image URLs and reports the replacements', async () => {
    const localizedUrl = '/api/images/image/remote/abc123'
    mocks.parseJsonBody.mockResolvedValue({
      title: '远程图片',
      content: '![图](https://cdn.example.com/image.png)',
      html: '<img src="https://cdn.example.com/image.png">',
      slug: 'remote-image-post',
    })
    mocks.createPost.mockResolvedValue(88)
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

    const response = await POST({} as never)
    const body = await response.json()

    expect(mocks.createPost).toHaveBeenCalledWith(
      { kind: 'db' },
      expect.objectContaining({
        content: `![图](${localizedUrl})`,
        html: `<img src="${localizedUrl}">`,
      }),
    )
    expect(mocks.recordLocalizedRemoteAssets).toHaveBeenCalledWith(
      { kind: 'db' },
      [{ url: localizedUrl }],
      { postId: 88, slug: 'remote-image-post' },
    )
    expect(body.remote_images).toEqual(
      expect.objectContaining({ found: 1, localized: 1 }),
    )
  })

  it('stores a category slug as the matching category name when creating posts', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      title: '分类 slug 输入',
      content: '正文内容',
      category: 'ai-news',
      slug: 'category-slug-input',
      status: 'draft',
    })
    mocks.createPost.mockResolvedValue(43)

    const response = await POST({} as never)
    const body = await response.json()

    expect(mocks.createPost).toHaveBeenCalledWith(
      { kind: 'db' },
      expect.objectContaining({
        category: 'AI资讯',
      }),
    )
    expect(body).toEqual(
      expect.objectContaining({
        success: true,
        category: 'AI资讯',
      }),
    )
  })

  it('upserts an existing post by slug when explicitly requested', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      upsert: true,
      slug: 'old-slug',
      title: '  新标题  ',
      content: '新正文',
      category: '更新分类',
      tags: ['新标签'],
      cover_image: '/covers/new.webp',
    })

    const response = await POST({} as never)
    const body = await response.json()

    expect(mocks.createPost).not.toHaveBeenCalled()
    expect(mocks.updatePost).toHaveBeenCalledWith(
      { kind: 'db' },
      7,
      expect.objectContaining({
        title: '新标题',
        content: '新正文',
        html: expect.stringContaining('<p>新正文</p>'),
        description: '新正文',
        category: '更新分类',
        tags: ['新标签'],
        cover_image: '/covers/new.webp',
      }),
    )
    expect(mocks.enqueueBackgroundJob).toHaveBeenCalledTimes(2)
    expect(body).toEqual(
      expect.objectContaining({
        success: true,
        action: 'updated',
        id: 7,
        slug: 'old-slug',
      }),
    )
  })

  it('stores a category slug as the matching category name when updating posts', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      current_slug: 'old-slug',
      content: '更新正文',
      category: 'paper',
    })

    const response = await PATCH({} as never)
    const body = await response.json()

    expect(mocks.updatePostBySlug).toHaveBeenCalledWith(
      { kind: 'db' },
      'old-slug',
      expect.objectContaining({
        category: '论文学习',
      }),
    )
    expect(body).toEqual({ success: true, slug: 'old-slug' })
  })

  it('reads a post by slug for external publishing tools', async () => {
    const response = await GET(
      new Request('https://example.com/api/posts?slug=old-slug') as never,
    )
    const body = await response.json()

    expect(mocks.getPostBySlug).toHaveBeenCalledWith({ kind: 'db' }, 'old-slug')
    expect(body).toEqual(
      expect.objectContaining({
        success: true,
        post: expect.objectContaining({ slug: 'old-slug' }),
      }),
    )
  })

  it('patches a post with fallback description and normalized next slug', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      current_slug: 'old-slug',
      new_slug: 'new_slug',
      title: '  新标题  ',
      content: '  新正文  ',
      description: '   ',
      status: 'draft',
      cover_image: '/covers/next.webp',
    })

    const response = await PATCH({} as never)
    const body = await response.json()

    expect(mocks.updatePostBySlug).toHaveBeenCalledWith(
      { kind: 'db' },
      'old-slug',
      expect.objectContaining({
        slug: 'new_slug',
        title: '新标题',
        content: '  新正文  ',
        html: expect.stringContaining('<p>新正文</p>'),
        description: '新正文',
        status: 'draft',
        cover_image: '/covers/next.webp',
      }),
    )
    expect(body).toEqual({ success: true, slug: 'new_slug' })
  })

  it('updates through PUT using the same external post payload contract', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      slug: 'old-slug',
      title: 'PUT 标题',
      content: 'PUT 正文',
    })

    const response = await PUT({} as never)
    const body = await response.json()

    expect(mocks.updatePostBySlug).toHaveBeenCalledWith(
      { kind: 'db' },
      'old-slug',
      expect.objectContaining({
        title: 'PUT 标题',
        content: 'PUT 正文',
        html: expect.stringContaining('<p>PUT 正文</p>'),
      }),
    )
    expect(body).toEqual({ success: true, id: undefined, slug: 'old-slug' })
  })

  it('patches an existing post by id when the client route slug is stale', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      current_id: 100,
      current_slug: '2026-05-02-dh5wth',
      new_slug: 'why-effort-isnt-enough',
      title: '更新标题',
      content: '更新正文',
    })
    mocks.getPostById.mockResolvedValue({
      id: 100,
      slug: 'why-effort-isnt-enough',
    })

    const response = await PATCH({} as never)
    const body = await response.json()

    expect(mocks.updatePost).toHaveBeenCalledWith(
      { kind: 'db' },
      100,
      expect.objectContaining({
        title: '更新标题',
        content: '更新正文',
        html: expect.stringContaining('<p>更新正文</p>'),
        description: '更新正文',
      }),
    )
    expect(mocks.updatePostBySlug).not.toHaveBeenCalled()
    expect(mocks.rememberPostSlugAlias).toHaveBeenCalledWith(
      { kind: 'db' },
      100,
      '2026-05-02-dh5wth',
      'why-effort-isnt-enough',
    )
    expect(body).toEqual({
      success: true,
      id: 100,
      slug: 'why-effort-isnt-enough',
    })
  })

  it('deletes a post by slug for external publishing tools', async () => {
    const response = await DELETE(
      new Request('https://example.com/api/posts?slug=old-slug', {
        method: 'DELETE',
      }) as never,
    )
    const body = await response.json()

    expect(mocks.deletePost).toHaveBeenCalledWith({ kind: 'db' }, 'old-slug')
    expect(mocks.invalidatePublicContentCache).toHaveBeenCalled()
    expect(mocks.enqueueBackgroundJob).toHaveBeenCalledWith(
      { AI_QUEUE: {} },
      { type: 'delete-post-related-index', postId: 7 },
      expect.any(Object),
    )
    expect(body).toEqual({ success: true, id: 7, slug: 'old-slug' })
  })
})
