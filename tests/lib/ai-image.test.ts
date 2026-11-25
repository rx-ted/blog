import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildOpenAiCompatGenerationAttempts,
  buildFinalImagePrompt,
  runWorkersAiCompatImageRequest,
  shouldAllowReadableTextInGeneratedImage,
} from '@/lib/ai-image'

describe('ai-image workers ai compat image request', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('retries with multipart form data when the model requires multipart input', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: "required properties at '/' are 'multipart'",
          }),
          {
            status: 400,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            image: Buffer.from('fake-image').toString('base64'),
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )

    vi.stubGlobal('fetch', fetchMock)

    const result = await runWorkersAiCompatImageRequest(
      {
        apiKey: 'test-key',
        baseURL:
          'https://api.cloudflare.com/client/v4/accounts/test-account/ai/v1',
        model: '@cf/black-forest-labs/flux-2-dev',
      },
      {
        prompt: '生成封面图',
        width: 1344,
        height: 768,
      },
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      }),
    })
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer test-key',
      }),
    })
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBeInstanceOf(FormData)
    expect(result).toEqual({
      image: Buffer.from('fake-image').toString('base64'),
    })
  })

  it('returns the raw response when workers ai sends back an image stream', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    const result = await runWorkersAiCompatImageRequest(
      {
        apiKey: 'test-key',
        baseURL:
          'https://api.cloudflare.com/client/v4/accounts/test-account/ai/v1',
        model: '@cf/black-forest-labs/flux-2-dev',
      },
      {
        prompt: '生成封面图',
        width: 1344,
        height: 768,
      },
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toBeInstanceOf(Response)
    expect((result as Response).headers.get('content-type')).toBe('image/png')
  })
})

describe('ai-image openai compatible request attempts', () => {
  it('tries the HiAPI GPT Image 2 Beta documented minimal payload first', () => {
    const attempts = buildOpenAiCompatGenerationAttempts(
      {
        baseURL: 'https://api.hiapi.ai/v1',
        providerType: 'openai_images',
      },
      {
        model: 'gpt-image-2-beta',
        prompt: '生成章节配图',
        size: '1792x1024',
        quality: 'high',
      },
    )

    expect(attempts[0]).toEqual({
      model: 'gpt-image-2-beta',
      prompt: '生成章节配图',
    })
    expect(attempts[1]).toEqual(
      expect.objectContaining({
        size: '1792x1024',
      }),
    )
  })

  it('keeps the richer OpenAI Images payload first for regular compatible providers', () => {
    const attempts = buildOpenAiCompatGenerationAttempts(
      {
        baseURL: 'https://api.openai.com/v1',
        providerType: 'openai_images',
      },
      {
        model: 'gpt-image-1',
        prompt: '生成章节配图',
        size: '1792x1024',
        quality: 'high',
      },
    )

    expect(attempts[0]).toEqual(
      expect.objectContaining({
        model: 'gpt-image-1',
        prompt: '生成章节配图',
        n: 1,
        size: '1792x1024',
        quality: 'high',
        output_format: 'webp',
        background: 'auto',
      }),
    )
  })
})

describe('ai-image prompt builder', () => {
  it('allows selected text to become readable infographic copy when requested', () => {
    const prompt = buildFinalImagePrompt(
      undefined,
      '生成信息图',
      '客户增长引擎',
      '线索获取 18.6，转化提效 12.4，复购提升 9.8',
      '3:4',
      '2k',
    )

    expect(
      shouldAllowReadableTextInGeneratedImage(undefined, '生成信息图'),
    ).toBe(true)
    expect(prompt).toContain('选中文本素材')
    expect(prompt).toContain('线索获取 18.6')
    expect(prompt).toContain('可以加入清晰可读的中文文字')
    expect(prompt).not.toContain('不要把这些文字直接渲染进图片')
  })

  it('keeps ordinary illustration prompts text-free by default', () => {
    const prompt = buildFinalImagePrompt(
      undefined,
      '生成一张章节配图',
      '触达率暴跌，第一个原因甚至和算法无关',
      '这是一段正文上下文',
      '16:9',
      '1k',
    )

    expect(
      shouldAllowReadableTextInGeneratedImage(undefined, '生成一张章节配图'),
    ).toBe(false)
    expect(prompt).toContain('不要在图片中加入可读文字')
    expect(prompt).toContain(
      '文章主题参考（仅用于理解主题，不要作为画面文字）：触达率暴跌',
    )
    expect(prompt).not.toContain('文章标题：触达率暴跌')
    expect(prompt).toContain('选中文本上下文')
  })

  it('lets custom prompts override default image text restrictions without keyword matching', () => {
    const prompt = buildFinalImagePrompt(
      undefined,
      '把下面内容做成一张商业分析卡片',
      '增长复盘',
      '收入增长 42%，留存提升 18%，获客成本下降 12%',
      '1:1',
      '2k',
      { strictUserPrompt: true },
    )

    expect(
      shouldAllowReadableTextInGeneratedImage(
        undefined,
        '把下面内容做成一张商业分析卡片',
      ),
    ).toBe(false)
    expect(prompt).toContain('用户自定义要求优先级最高')
    expect(prompt).toContain('选中文本/输入素材')
    expect(prompt).toContain('收入增长 42%')
    expect(prompt).not.toContain('除非用户明确要求，不要在图片中加入可读文字')
  })
})
