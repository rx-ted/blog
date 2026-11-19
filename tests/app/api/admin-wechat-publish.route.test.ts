import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  ensureAuthenticatedRequest: vi.fn(),
  getRouteEnvWithDb: vi.fn(),
  parseJsonBody: vi.fn(),
  getWechatBridgeConfig: vi.fn(),
  assertWechatBridgeReady: vi.fn(),
  fetchWechatBridgeJson: vi.fn(),
}))

vi.mock('@/lib/server/route-helpers', () => ({
  ensureAuthenticatedRequest: mocks.ensureAuthenticatedRequest,
  getRouteEnvWithDb: mocks.getRouteEnvWithDb,
  jsonError: (message: string, status = 500) => Response.json({ error: message }, { status }),
  jsonOk: (data: unknown, status = 200) => Response.json(data, { status }),
  parseJsonBody: mocks.parseJsonBody,
}))

vi.mock('@/lib/wechat-bridge-config', () => ({
  getWechatBridgeConfig: mocks.getWechatBridgeConfig,
  assertWechatBridgeReady: mocks.assertWechatBridgeReady,
  fetchWechatBridgeJson: mocks.fetchWechatBridgeJson,
}))

import { POST } from '@/app/api/admin/wechat-publish/route'

describe('/api/admin/wechat-publish route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getRouteEnvWithDb.mockResolvedValue({
      ok: true,
      db: { kind: 'db' },
      env: { kind: 'env' },
    })
    mocks.ensureAuthenticatedRequest.mockResolvedValue(null)
    mocks.getWechatBridgeConfig.mockResolvedValue({
      enabled: true,
      base_url: 'http://bridge.test:8788',
      token: 'bridge-token',
    })
    mocks.assertWechatBridgeReady.mockImplementation((config) => config)
  })

  it('rejects missing account_id', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      title: 'Test title',
      content_html: '<p>Hello</p>',
    })

    const response = await POST({} as never)
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: '请选择公众号账号' })
    expect(mocks.fetchWechatBridgeJson).not.toHaveBeenCalled()
  })

  it('returns dry-run inspect results without calling bridge', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      dry_run: true,
      title: `  ${'题'.repeat(65)}  `,
      content_html: '<ul><li>Item</li></ul>',
      digest: `  ${'摘'.repeat(140)}  `,
    })

    const response = await POST({} as never)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.inspect.checks.map((check: { code: string }) => check.code)).toEqual(expect.arrayContaining([
      'MISSING_ACCOUNT',
      'TITLE_TOO_LONG',
      'DIGEST_TOO_LONG',
      'LIST_MARKERS_MISSING',
    ]))
    expect(body.inspect.readiness.draft_ready).toBe(false)
    expect(mocks.getWechatBridgeConfig).not.toHaveBeenCalled()
    expect(mocks.fetchWechatBridgeJson).not.toHaveBeenCalled()
  })

  it('forwards publish payload to bridge', async () => {
    const timeoutSignal = new AbortController().signal
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeoutSignal)

    mocks.parseJsonBody.mockResolvedValue({
      account_id: 'main',
      title: '  Test title  ',
      content_html: ' <p>Hello</p> ',
      author: '  Joe  ',
      digest: '  Summary  ',
      content_source_url: ' https://example.com/post ',
      cover_image_url: ' https://example.com/cover.jpg ',
      publish_now: true,
      need_open_comment: true,
      only_fans_can_comment: false,
    })
    mocks.fetchWechatBridgeJson.mockResolvedValue({
      success: true,
      media_id: 'MEDIA_ID',
      publish_id: 'PUBLISH_ID',
    })

    try {
      const response = await POST({} as never)
      const body = await response.json()

      expect(timeoutSpy).toHaveBeenCalledWith(180_000)
      expect(mocks.fetchWechatBridgeJson).toHaveBeenCalledWith(
        {
          enabled: true,
          base_url: 'http://bridge.test:8788',
          token: 'bridge-token',
        },
        '/v1/wechat/publish',
        {
          method: 'POST',
          signal: timeoutSignal,
          body: JSON.stringify({
            account_id: 'main',
            title: 'Test title',
            content_html: '<p>Hello</p>',
            author: 'Joe',
            digest: 'Summary',
            content_source_url: 'https://example.com/post',
            cover_image_url: 'https://example.com/cover.jpg',
            publish_now: true,
            need_open_comment: true,
            only_fans_can_comment: false,
          }),
        },
      )
      expect(body).toEqual({
        success: true,
        media_id: 'MEDIA_ID',
        publish_id: 'PUBLISH_ID',
      })
    } finally {
      timeoutSpy.mockRestore()
    }
  })

  it('normalizes WeChat draft text fields before forwarding', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      account_id: 'main',
      title: `  ${'题'.repeat(64)}  `,
      content_html: '<p>Hello</p>',
      author: `  ${'作'.repeat(20)}  `,
      digest: `  ${'摘'.repeat(140)}  `,
    })
    mocks.fetchWechatBridgeJson.mockResolvedValue({
      success: true,
      media_id: 'MEDIA_ID',
    })

    const response = await POST({} as never)
    expect(response.status).toBe(200)

    const [, , requestInit] = mocks.fetchWechatBridgeJson.mock.calls[0]
    const forwarded = JSON.parse(String(requestInit.body))

    expect(forwarded.title).toBe('题'.repeat(64))
    expect(forwarded.author).toBe('作'.repeat(16))
    expect(forwarded.digest).toBe('摘'.repeat(40))
    expect(Buffer.byteLength(forwarded.digest, 'utf8')).toBeLessThanOrEqual(120)
  })

  it('rejects overlong WeChat draft API titles before bridge submission', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      account_id: 'main',
      title: '题'.repeat(65),
      content_html: '<p>Hello</p>',
    })

    const response = await POST({} as never)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: expect.stringContaining('标题超过微信草稿 API 的 64 个字限制'),
    })
    expect(mocks.getWechatBridgeConfig).not.toHaveBeenCalled()
    expect(mocks.fetchWechatBridgeJson).not.toHaveBeenCalled()
  })

  it('rejects publish payloads with inline data URL images before bridge submission', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      account_id: 'main',
      title: 'Inline Image Post',
      content_html: '<p>Hello</p><img src="data:image/png;base64,abc">',
    })

    const response = await POST({} as never)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: '公众号发布前检查未通过：正文图片不能使用 inline data URL。',
    })
    expect(mocks.getWechatBridgeConfig).not.toHaveBeenCalled()
    expect(mocks.fetchWechatBridgeJson).not.toHaveBeenCalled()
  })

  it('applies default author, comments, and cover image when omitted', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      account_id: 'main',
      title: 'No Cover Post',
      content_html: '<p>Hello</p>',
    })
    mocks.fetchWechatBridgeJson.mockResolvedValue({
      success: true,
      media_id: 'MEDIA_ID',
    })

    const response = await POST({} as never)
    expect(response.status).toBe(200)

    const [, , requestInit] = mocks.fetchWechatBridgeJson.mock.calls[0]
    const forwarded = JSON.parse(String(requestInit.body))

    expect(forwarded.author).toBe('rx-ted')
    expect(forwarded.need_open_comment).toBe(true)
    expect(forwarded.only_fans_can_comment).toBe(false)
    expect(forwarded.cover_image_url).toMatch(/^https:\/\/blog\.19981204\.xyz\/default-covers\/qm-cover-[1-3]\.jpg$/)
  })

  it('returns a clear timeout error when bridge publish takes too long', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      account_id: 'main',
      title: 'Slow Image Post',
      content_html: '<p>Hello</p>',
    })
    const timeoutError = new Error('The operation was aborted due to timeout')
    timeoutError.name = 'TimeoutError'
    mocks.fetchWechatBridgeJson.mockRejectedValue(timeoutError)

    const response = await POST({} as never)

    expect(response.status).toBe(504)
    await expect(response.json()).resolves.toEqual({
      error: '提交公众号发布超时，文章图片较多时可能需要更久。请稍后查看公众号草稿，或重试。',
    })
  })

  it('maps WeChat description limit errors to a focused digest hint', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      account_id: 'main',
      title: 'Digest Post',
      content_html: '<p>Hello</p>',
    })
    mocks.fetchWechatBridgeJson.mockRejectedValue(
      new Error('description size out of limit hint errcode=45004 path=/cgi-bin/draft/add'),
    )

    const response = await POST({} as never)

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: '微信公众号摘要/描述超出限制，请把摘要控制在 120 bytes 以内后重试。',
    })
  })
})
