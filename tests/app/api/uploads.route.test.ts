import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAppCloudflareEnv: vi.fn(),
  authenticateRequest: vi.fn(),
  nanoid: vi.fn(() => 'fixednano'),
  upsertMediaAsset: vi.fn(),
  linkMediaAssetToArticle: vi.fn(),
}))

vi.mock('@/lib/cloudflare', () => ({
  getAppCloudflareEnv: mocks.getAppCloudflareEnv,
}))

vi.mock('@/lib/admin-auth', () => ({
  authenticateRequest: mocks.authenticateRequest,
}))

vi.mock('nanoid', () => ({
  nanoid: mocks.nanoid,
}))

vi.mock('@/lib/repositories/media-assets', () => ({
  upsertMediaAsset: mocks.upsertMediaAsset,
  linkMediaAssetToArticle: mocks.linkMediaAssetToArticle,
}))

import { POST } from '@/app/api/uploads/route'

function createFormRequest(file: File, fields: Record<string, string> = {}) {
  return {
    formData: vi.fn(async () => {
      const form = new FormData()
      form.append('file', file)
      for (const [key, value] of Object.entries(fields)) {
        form.append(key, value)
      }
      return form
    }),
  } as never
}

type UploadResponseBody = {
  success?: boolean
  deduplicated?: boolean
  type?: string
  delivery?: string
  key?: string
  variants?: Record<string, string>
  assetId?: number
  error?: string
}

describe('/api/uploads route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authenticateRequest.mockResolvedValue(true)
    mocks.upsertMediaAsset.mockResolvedValue({ id: 99 })
    mocks.linkMediaAssetToArticle.mockResolvedValue(undefined)
  })

  it('rejects unauthenticated upload requests', async () => {
    mocks.authenticateRequest.mockResolvedValue(false)
    mocks.getAppCloudflareEnv.mockResolvedValue({ DB: { kind: 'db' } })

    const response = await POST(
      createFormRequest(new File(['x'], 'cover.png', { type: 'image/png' })),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('returns a deduplicated response when the small-file key already exists', async () => {
    const get = vi.fn(async () => ({
      customMetadata: { originalName: 'cover.png' },
    }))
    const put = vi.fn(async () => undefined)
    mocks.getAppCloudflareEnv.mockResolvedValue({
      DB: { kind: 'db' },
      IMAGES: { get, put },
      ENABLE_CF_IMAGE_PIPELINE: 'true',
    })

    const file = new File(['small-image'], 'cover.png', { type: 'image/png' })
    const response = await POST(createFormRequest(file))
    const body = (await response.json()) as UploadResponseBody

    expect(body.success).toBe(true)
    expect(body.deduplicated).toBe(true)
    expect(body.type).toBe('image')
    expect(body.delivery).toBe('cloudflare')
    expect(body.variants).toEqual({
      raw: expect.stringContaining('/api/images/image/'),
      content: expect.stringContaining('format=webp'),
      thumb: expect.stringContaining('w=960'),
      cover: expect.stringContaining('fit=cover'),
    })
    expect(body.assetId).toBe(99)
    expect(mocks.upsertMediaAsset).toHaveBeenCalledWith(
      { kind: 'db' },
      expect.objectContaining({
        source: 'upload',
        url: expect.stringContaining('/api/images/image/'),
        mimeType: 'image/png',
        alt: 'cover.png',
      }),
    )
    expect(put).not.toHaveBeenCalled()
  })

  it('uploads larger files with mime fallback and generated keys', async () => {
    const get = vi.fn(async () => null)
    const put = vi.fn(async () => undefined)
    mocks.getAppCloudflareEnv.mockResolvedValue({
      DB: { kind: 'db' },
      IMAGES: { get, put },
    })

    const largeContent = new Uint8Array(6 * 1024 * 1024)
    const file = new File([largeContent], 'movie.mov', {
      type: 'application/octet-stream',
    })

    const response = await POST(createFormRequest(file))
    const body = (await response.json()) as UploadResponseBody

    expect(body.success).toBe(true)
    expect(body.type).toBe('document')
    expect(body.delivery).toBe('origin')
    expect(body.key).toContain('/fixednano-movie.mov')
    expect(put).toHaveBeenCalledWith(
      expect.stringContaining('/fixednano-movie.mov'),
      file,
      expect.objectContaining({
        httpMetadata: expect.objectContaining({
          contentType: 'video/quicktime',
        }),
        customMetadata: {
          originalName: 'movie.mov',
        },
      }),
    )
  })

  it('passes article relation fields when indexing uploaded images', async () => {
    const get = vi.fn(async () => null)
    const put = vi.fn(async () => undefined)
    mocks.getAppCloudflareEnv.mockResolvedValue({
      DB: { kind: 'db' },
      IMAGES: { get, put },
    })

    const response = await POST(
      createFormRequest(
        new File(['image'], 'inline.png', { type: 'image/png' }),
        {
          postId: '42',
          slug: 'hello-world',
          role: 'cover',
          source: 'collage',
        },
      ),
    )
    const body = (await response.json()) as UploadResponseBody

    expect(body.success).toBe(true)
    expect(body.assetId).toBe(99)
    expect(mocks.upsertMediaAsset).toHaveBeenCalledWith(
      { kind: 'db' },
      expect.objectContaining({
        source: 'collage',
        r2Key: expect.stringContaining('inline.png'),
        url: expect.stringContaining('/api/images/image/'),
      }),
    )
    expect(mocks.linkMediaAssetToArticle).toHaveBeenCalledWith(
      { kind: 'db' },
      {
        assetId: 99,
        postId: 42,
        slug: 'hello-world',
        role: 'cover',
      },
    )
  })

  it('rejects unsupported file types before upload', async () => {
    const get = vi.fn(async () => null)
    const put = vi.fn(async () => undefined)
    mocks.getAppCloudflareEnv.mockResolvedValue({
      DB: { kind: 'db' },
      IMAGES: { get, put },
    })

    const response = await POST(
      createFormRequest(
        new File(['x'], 'script.exe', { type: 'application/x-msdownload' }),
      ),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: '不支持的文件类型: application/x-msdownload',
    })
    expect(put).not.toHaveBeenCalled()
  })
})
