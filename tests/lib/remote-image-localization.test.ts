import { describe, expect, it, vi } from 'vitest'
import { localizeRemotePostImages } from '@/lib/remote-image-localization'

function createBucket(
  existing: Awaited<
    ReturnType<
      NonNullable<
        Parameters<typeof localizeRemotePostImages>[0]['bucket']
      >['get']
    >
  > = null,
) {
  return {
    get: vi.fn(async () => existing),
    put: vi.fn(async () => undefined),
  }
}

function createImageResponse(
  body = 'png',
  headers: Record<string, string> = {},
) {
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'image/png',
      ...headers,
    },
  })
}

describe('remote image localization', () => {
  it('downloads one remote image, stores it once, and rewrites Markdown, HTML, and cover references', async () => {
    const bucket = createBucket()
    const fetchImpl = vi.fn(async () => createImageResponse('image-bytes'))
    const sourceUrl = 'https://cdn.example.com/article/image.png?x=1&y=2'

    const result = await localizeRemotePostImages({
      bucket,
      content: `![示例](${sourceUrl})`,
      html: `<p><img src="https://cdn.example.com/article/image.png?x=1&amp;y=2"></p>`,
      coverImage: sourceUrl,
      siteUrl: 'https://blog.19981204.xyz',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(bucket.put).toHaveBeenCalledTimes(1)
    expect(bucket.put).toHaveBeenCalledWith(
      expect.stringMatching(/^image\/remote\/[a-f0-9]{24}$/),
      expect.any(ArrayBuffer),
      expect.objectContaining({
        httpMetadata: expect.objectContaining({ contentType: 'image/png' }),
        customMetadata: expect.objectContaining({
          sourceHost: 'cdn.example.com',
        }),
      }),
    )
    expect(result.content).toMatch(
      /^!\[示例]\(\/api\/images\/image\/remote\/[a-f0-9]{24}\)$/,
    )
    expect(result.html).toMatch(
      /^<p><img src="\/api\/images\/image\/remote\/[a-f0-9]{24}"><\/p>$/,
    )
    expect(result.coverImage).toMatch(
      /^\/api\/images\/image\/remote\/[a-f0-9]{24}$/,
    )
    expect(result.report).toEqual(
      expect.objectContaining({
        found: 1,
        localized: 1,
        reused: 0,
        skipped: 0,
      }),
    )
    expect(result.assets).toEqual([
      expect.objectContaining({
        sourceUrl,
        mimeType: 'image/png',
        role: 'cover',
        reused: false,
      }),
    ])
  })

  it('reuses an existing stable R2 key without downloading the remote image again', async () => {
    const bucket = createBucket({
      size: 1234,
      httpMetadata: { contentType: 'image/webp' },
      customMetadata: { originalName: 'saved.webp' },
    })
    const fetchImpl = vi.fn()

    const result = await localizeRemotePostImages({
      bucket,
      html: '<img src="https://images.example.com/saved.webp">',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(bucket.put).not.toHaveBeenCalled()
    expect(result.html).toContain('/api/images/image/remote/')
    expect(result.report).toEqual(
      expect.objectContaining({
        found: 1,
        localized: 0,
        reused: 1,
        skipped: 0,
      }),
    )
    expect(result.assets[0]).toEqual(
      expect.objectContaining({
        alt: 'saved.webp',
        sizeBytes: 1234,
        reused: true,
      }),
    )
  })

  it('keeps private-network image URLs unchanged and never fetches them', async () => {
    const bucket = createBucket()
    const fetchImpl = vi.fn()
    const content = '![secret](http://127.0.0.1:8787/private.png)'

    const result = await localizeRemotePostImages({
      bucket,
      content,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(bucket.get).not.toHaveBeenCalled()
    expect(result.content).toBe(content)
    expect(result.report.skipped).toBe(1)
    expect(result.report.failures[0].error).toContain('私有网络')
  })

  it('validates redirect targets before following them', async () => {
    const bucket = createBucket()
    const fetchImpl = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: 'http://169.254.169.254/latest/meta-data' },
        }),
    )
    const html = '<img src="https://images.example.com/redirect.png">'

    const result = await localizeRemotePostImages({
      bucket,
      html,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(bucket.put).not.toHaveBeenCalled()
    expect(result.html).toBe(html)
    expect(result.report.failures[0].error).toContain('私有网络')
  })

  it('keeps non-image responses and oversized images as remote URLs', async () => {
    const bucket = createBucket()
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('<html></html>', {
          headers: { 'content-type': 'text/html' },
        }),
      )
      .mockResolvedValueOnce(
        createImageResponse('', {
          'content-length': String(16 * 1024 * 1024),
        }),
      )
    const html = [
      '<img src="https://example.com/not-an-image">',
      '<img src="https://example.com/too-large.png">',
    ].join('')

    const result = await localizeRemotePostImages({
      bucket,
      html,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })

    expect(bucket.put).not.toHaveBeenCalled()
    expect(result.html).toBe(html)
    expect(result.report).toEqual(
      expect.objectContaining({
        found: 2,
        localized: 0,
        skipped: 2,
      }),
    )
    expect(
      result.report.failures.map((failure) => failure.error).join('\n'),
    ).toContain('受支持的图片')
    expect(
      result.report.failures.map((failure) => failure.error).join('\n'),
    ).toContain('15MB')
  })

  it('skips same-site images and degrades safely when R2 is not configured', async () => {
    const sameSite = await localizeRemotePostImages({
      html: '<img src="https://blog.19981204.xyz/api/images/image/example.webp">',
      siteUrl: 'https://blog.19981204.xyz',
    })
    expect(sameSite.report.found).toBe(0)

    const remoteHtml = '<img src="https://example.com/remote.png">'
    const noBucket = await localizeRemotePostImages({ html: remoteHtml })
    expect(noBucket.html).toBe(remoteHtml)
    expect(noBucket.report).toEqual(
      expect.objectContaining({ found: 1, skipped: 1 }),
    )
    expect(noBucket.report.failures[0].error).toContain('图片存储未配置')
  })
})
