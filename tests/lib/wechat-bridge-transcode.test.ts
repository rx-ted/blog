import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'

const originalImageMagickBin = process.env.IMAGEMAGICK_CONVERT
const originalConvertTimeout = process.env.WECHAT_IMAGE_CONVERT_TIMEOUT_MS
const originalFetch = globalThis.fetch
const tempDirs: string[] = []

afterEach(async () => {
  if (originalImageMagickBin === undefined) {
    delete process.env.IMAGEMAGICK_CONVERT
  } else {
    process.env.IMAGEMAGICK_CONVERT = originalImageMagickBin
  }
  if (originalConvertTimeout === undefined) {
    delete process.env.WECHAT_IMAGE_CONVERT_TIMEOUT_MS
  } else {
    process.env.WECHAT_IMAGE_CONVERT_TIMEOUT_MS = originalConvertTimeout
  }
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()

  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  )
})

describe('WeChat bridge local image transcoding', () => {
  async function importBridge(fixtureDir: string) {
    const fakeConvertPath = path.join(fixtureDir, 'fake-convert.mjs')
    const invocationLogPath = path.join(fixtureDir, 'invocations.jsonl')
    await writeFile(
      fakeConvertPath,
      `#!/usr/bin/env node
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
appendFileSync(${JSON.stringify(invocationLogPath)}, JSON.stringify(args) + '\\n')

if (args.at(-1) === 'info:') {
  const input = args[0] || ''
  const source = readFileSync(input).toString()
  process.stdout.write(source.includes('animated') ? '2\\n2\\n' : '1\\n')
  process.exit(0)
}

const rawOutput = args.at(-1) || ''
const output = rawOutput.replace(/^(?:gif|jpeg):/, '')
const input = (args[0] || '').replace(/\\[0\\]$/, '')
if (readFileSync(input).toString().includes('slow')) {
  await new Promise(resolve => setTimeout(resolve, 200))
}
writeFileSync(output, Buffer.from(rawOutput.startsWith('gif:') ? 'fake-gif' : 'fake-jpeg'))
`,
    )
    await chmod(fakeConvertPath, 0o755)
    process.env.IMAGEMAGICK_CONVERT = fakeConvertPath

    const serverUrl = pathToFileURL(
      path.join(process.cwd(), 'tools/wechat-bridge/server.mjs'),
    )
    serverUrl.searchParams.set('test', `${Date.now()}-${Math.random()}`)
    const bridge = (await import(serverUrl.href)) as {
      WECHAT_ARTICLE_IMAGE_TYPES: readonly string[]
      getAccessToken: (
        account: { id: string; appid: string; secret: string },
        options?: { forceRefresh?: boolean },
      ) => Promise<string>
      wxUploadForm: (
        account: { id: string; appid: string; secret: string },
        path: string,
        searchParams: Record<string, string>,
        formData: FormData,
      ) => Promise<Record<string, unknown>>
      shouldPassThroughOversizedGif: (
        kind: string,
        contentType: string,
      ) => boolean
      normalizeImageFile: (
        download: {
          buffer: Buffer
          contentType: string
          fileName: string
          url: string
        },
        allowedTypes: readonly string[],
      ) => { blob: Blob; contentType: string; fileName: string }
      describeImageSource: (inputUrl: string) => string
      pickAnimatedGifTranscodePreset: (sourceBytes: number) => {
        width: number
        colors: number
      }
      transcodeImageLocally: (
        download: {
          buffer: Buffer
          contentType: string
          fileName: string
          url: string
        },
        options: { kind: 'content' | 'cover'; maxBytes: number },
      ) => Promise<{ blob: Blob; contentType: string; fileName: string }>
    }

    return { bridge, invocationLogPath }
  }

  it('requests and caches a stable WeChat access token', async () => {
    const fixtureDir = await mkdtemp(
      path.join(os.tmpdir(), 'qmblog-wechat-transcode-test-'),
    )
    tempDirs.push(fixtureDir)
    const { bridge } = await importBridge(fixtureDir)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'stable-token',
          expires_in: 7200,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    globalThis.fetch = fetchMock as typeof fetch

    const account = {
      id: 'account-1',
      appid: 'test-app-id',
      secret: 'test-secret',
    }
    await expect(bridge.getAccessToken(account)).resolves.toBe('stable-token')
    await expect(bridge.getAccessToken(account)).resolves.toBe('stable-token')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.weixin.qq.com/cgi-bin/stable_token',
    )
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      grant_type: 'client_credential',
      appid: 'test-app-id',
      secret: 'test-secret',
      force_refresh: false,
    })
  })

  it('refreshes an invalid token and retries an upload exactly once', async () => {
    const fixtureDir = await mkdtemp(
      path.join(os.tmpdir(), 'qmblog-wechat-transcode-test-'),
    )
    tempDirs.push(fixtureDir)
    const { bridge } = await importBridge(fixtureDir)
    const jsonResponse = (payload: Record<string, unknown>) =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ access_token: 'expired-token', expires_in: 7200 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ errcode: 40001, errmsg: 'invalid credential' }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ access_token: 'fresh-token', expires_in: 7200 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ url: 'https://mmbiz.qpic.cn/fresh-image' }),
      )
    globalThis.fetch = fetchMock as typeof fetch

    const account = {
      id: 'account-2',
      appid: 'test-app-id',
      secret: 'test-secret',
    }
    const formData = new FormData()
    formData.append('media', new Blob(['image']), 'image.jpg')

    await expect(
      bridge.wxUploadForm(account, '/cgi-bin/media/uploadimg', {}, formData),
    ).resolves.toEqual({ url: 'https://mmbiz.qpic.cn/fresh-image' })

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      'access_token=expired-token',
    )
    expect(String(fetchMock.mock.calls[3]?.[0])).toContain(
      'access_token=fresh-token',
    )
    expect(
      JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body)),
    ).toMatchObject({
      force_refresh: true,
    })
  })

  it('keeps supported GIF files unchanged for direct article upload', async () => {
    const fixtureDir = await mkdtemp(
      path.join(os.tmpdir(), 'qmblog-wechat-transcode-test-'),
    )
    tempDirs.push(fixtureDir)
    const { bridge } = await importBridge(fixtureDir)

    expect(bridge.WECHAT_ARTICLE_IMAGE_TYPES).toContain('image/gif')

    const result = bridge.normalizeImageFile(
      {
        buffer: Buffer.from('gif89a-animated'),
        contentType: 'image/gif',
        fileName: 'animated.gif',
        url: 'https://example.com/animated.gif',
      },
      bridge.WECHAT_ARTICLE_IMAGE_TYPES,
    )

    expect(result.contentType).toBe('image/gif')
    expect(result.fileName).toBe('animated.gif')
    expect(Buffer.from(await result.blob.arrayBuffer()).toString()).toBe(
      'gif89a-animated',
    )
  })

  it('passes oversized article GIFs through instead of pre-compressing them', async () => {
    const fixtureDir = await mkdtemp(
      path.join(os.tmpdir(), 'qmblog-wechat-transcode-test-'),
    )
    tempDirs.push(fixtureDir)
    const { bridge } = await importBridge(fixtureDir)

    expect(bridge.shouldPassThroughOversizedGif('content', 'image/gif')).toBe(
      true,
    )
    expect(bridge.shouldPassThroughOversizedGif('cover', 'image/gif')).toBe(
      false,
    )
    expect(bridge.shouldPassThroughOversizedGif('content', 'image/webp')).toBe(
      false,
    )
  })

  it('redacts signed image URL details from bridge error labels', async () => {
    const fixtureDir = await mkdtemp(
      path.join(os.tmpdir(), 'qmblog-wechat-transcode-test-'),
    )
    tempDirs.push(fixtureDir)
    const { bridge } = await importBridge(fixtureDir)

    expect(
      bridge.describeImageSource(
        'https://files.example.com/path/image.gif?signature=signed-value#fragment',
      ),
    ).toBe('files.example.com')
    expect(bridge.describeImageSource('not-a-url')).toBe('unknown')
  })

  it('keeps all frames when animated content images need local conversion', async () => {
    const fixtureDir = await mkdtemp(
      path.join(os.tmpdir(), 'qmblog-wechat-transcode-test-'),
    )
    tempDirs.push(fixtureDir)
    const { bridge, invocationLogPath } = await importBridge(fixtureDir)

    const result = await bridge.transcodeImageLocally(
      {
        buffer: Buffer.from('animated-image'),
        contentType: 'image/webp',
        fileName: 'animated.webp',
        url: 'https://example.com/animated.webp',
      },
      {
        kind: 'content',
        maxBytes: 1024,
      },
    )

    expect(result.contentType).toBe('image/gif')
    expect(result.fileName).toBe('animated.gif')
    expect(Buffer.from(await result.blob.arrayBuffer()).toString()).toBe(
      'fake-gif',
    )

    const invocations = (await readFile(invocationLogPath, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as string[])
    const conversion = invocations.at(-1) || []
    expect(conversion[0]).toMatch(/input\.bin$/)
    expect(conversion[0]).not.toMatch(/\[0\]$/)
    expect(conversion).toContain('-coalesce')
    expect(conversion).toContain('Optimize')
    expect(conversion.at(-1)).toMatch(/^gif:/)
    expect(invocations.filter((args) => args.at(-1) !== 'info:')).toHaveLength(
      1,
    )
  })

  it('starts oversized animated images at a bounded mobile-friendly preset', async () => {
    const fixtureDir = await mkdtemp(
      path.join(os.tmpdir(), 'qmblog-wechat-transcode-test-'),
    )
    tempDirs.push(fixtureDir)
    const { bridge } = await importBridge(fixtureDir)

    expect(bridge.pickAnimatedGifTranscodePreset(7.4 * 1024 * 1024)).toEqual({
      width: 240,
      colors: 24,
    })
    expect(bridge.pickAnimatedGifTranscodePreset(4 * 1024 * 1024)).toEqual({
      width: 480,
      colors: 64,
    })
    expect(bridge.pickAnimatedGifTranscodePreset(2 * 1024 * 1024)).toEqual({
      width: 560,
      colors: 80,
    })
  })

  it('stops an animated conversion before it can outlive the publish request', async () => {
    const fixtureDir = await mkdtemp(
      path.join(os.tmpdir(), 'qmblog-wechat-transcode-test-'),
    )
    tempDirs.push(fixtureDir)
    process.env.WECHAT_IMAGE_CONVERT_TIMEOUT_MS = '25'
    const { bridge } = await importBridge(fixtureDir)

    await expect(
      bridge.transcodeImageLocally(
        {
          buffer: Buffer.from('animated-slow-image'),
          contentType: 'image/webp',
          fileName: 'slow.webp',
          url: 'https://example.com/slow.webp',
        },
        {
          kind: 'content',
          maxBytes: 1024,
        },
      ),
    ).rejects.toThrow('动图转换超过 1 秒，已停止处理以避免发布超时')
  })

  it('still flattens static content images to one JPEG', async () => {
    const fixtureDir = await mkdtemp(
      path.join(os.tmpdir(), 'qmblog-wechat-transcode-test-'),
    )
    tempDirs.push(fixtureDir)
    const { bridge, invocationLogPath } = await importBridge(fixtureDir)

    const result = await bridge.transcodeImageLocally(
      {
        buffer: Buffer.from('static-image'),
        contentType: 'image/webp',
        fileName: 'static.webp',
        url: 'https://example.com/static.webp',
      },
      {
        kind: 'content',
        maxBytes: 1024,
      },
    )

    expect(result.contentType).toBe('image/jpeg')
    expect(result.fileName).toBe('static.jpg')
    expect(Buffer.from(await result.blob.arrayBuffer()).toString()).toBe(
      'fake-jpeg',
    )

    const invocations = (await readFile(invocationLogPath, 'utf8'))
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as string[])
    const conversion = invocations.at(-1) || []
    expect(conversion[0]).toMatch(/input\.bin\[0\]$/)
    expect(conversion.at(-1)).toMatch(/^jpeg:/)
  })
})
