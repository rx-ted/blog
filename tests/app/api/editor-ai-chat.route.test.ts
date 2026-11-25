import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  ensureAuthenticatedRequest: vi.fn(),
  getRouteEnvWithDb: vi.fn(),
  parseJsonBody: vi.fn(),
  resolveConfig: vi.fn(),
  getAiRuntimeEnv: vi.fn((env: unknown) => env),
  createOpenAICompatible: vi.fn(),
  streamText: vi.fn(),
  convertToModelMessages: vi.fn(),
  validateUIMessages: vi.fn(),
  generateEditorImage: vi.fn(),
  searchWeb: vi.fn(),
  fetchPageMarkdown: vi.fn(),
  fetchTranscript: vi.fn(),
  linkMediaAssetToArticle: vi.fn(),
  recordAiChatToolAction: vi.fn(),
}))

vi.mock('@/lib/server/route-helpers', () => ({
  ensureAuthenticatedRequest: mocks.ensureAuthenticatedRequest,
  getRouteEnvWithDb: mocks.getRouteEnvWithDb,
  jsonError: (message: string, status = 500) =>
    Response.json({ error: message }, { status }),
  parseJsonBody: mocks.parseJsonBody,
}))

vi.mock('@/lib/ai', () => ({
  getAiRuntimeEnv: mocks.getAiRuntimeEnv,
  resolveConfig: mocks.resolveConfig,
}))

vi.mock('@/lib/ai-image', () => ({
  generateEditorImage: mocks.generateEditorImage,
}))

vi.mock('@/lib/ai-transcript-research', () => ({
  fetchTranscript: mocks.fetchTranscript,
  isSupportedTranscriptUrl: (url: string) =>
    /xiaoyuzhoufm\.com|youtube\.com|youtu\.be|bilibili\.com|b23\.tv/.test(url),
}))

vi.mock('@/lib/ai-web-research', () => ({
  searchWeb: mocks.searchWeb,
  fetchPageMarkdown: mocks.fetchPageMarkdown,
}))

vi.mock('@/lib/repositories/media-assets', () => ({
  linkMediaAssetToArticle: mocks.linkMediaAssetToArticle,
  recordAiChatToolAction: mocks.recordAiChatToolAction,
}))

vi.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAICompatible: mocks.createOpenAICompatible,
}))

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>()
  return {
    ...actual,
    streamText: mocks.streamText,
    convertToModelMessages: mocks.convertToModelMessages,
    validateUIMessages: mocks.validateUIMessages,
  }
})

import { POST } from '@/app/api/editor/ai-chat/route'

function textStream() {
  return new ReadableStream({
    start(controller) {
      controller.enqueue({ type: 'text-start', id: 'text-1' })
      controller.enqueue({ type: 'text-delta', id: 'text-1', delta: '你好' })
      controller.enqueue({ type: 'text-end', id: 'text-1' })
      controller.close()
    },
  })
}

function generatedImageResult() {
  return {
    url: '/api/images/image%2Fgenerated.webp',
    variants: {
      raw: '/api/images/image%2Fgenerated.webp',
      content: '/api/images/image%2Fgenerated.webp?w=1600',
      thumb: '/api/images/image%2Fgenerated.webp?w=960',
      cover: '/api/images/image%2Fgenerated.webp?w=1600&h=900',
    },
    alt: '生成图片',
    prompt: '最终提示词',
    revisedPrompt: '修订提示词',
    aspectRatio: '16:9',
    resolution: '2k',
    actionLabel: 'AI 对话配图',
    model: 'image-model',
    profileName: 'image-profile',
    assetId: 12,
  }
}

describe('/api/editor/ai-chat route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getRouteEnvWithDb.mockResolvedValue({
      ok: true,
      db: { kind: 'db' },
      env: {
        DB: { kind: 'db' },
        IMAGES: { put: vi.fn() },
        AI_CONFIG_ENCRYPTION_SECRET: 'secret',
        ADMIN_TOKEN_SALT: 'salt',
        ENABLE_AI_WEB_RESEARCH: 'true',
        ENABLE_AI_TRANSCRIPT_RESEARCH: 'true',
        PIPELLM_API_KEY: 'pipe-key',
        GETNOTE_API_KEY: 'getnote-key',
        GETNOTE_CLIENT_ID: 'getnote-client',
      },
    })
    mocks.ensureAuthenticatedRequest.mockResolvedValue(null)
    mocks.parseJsonBody.mockResolvedValue({
      messages: [
        {
          id: 'user-1',
          role: 'user',
          parts: [{ type: 'text', text: '生成一张配图' }],
        },
      ],
      context: {
        title: '文章标题',
        documentText: '正文内容',
        sectionToc: '1. H2 第一节\n2. H2 第二节',
        currentSection: '2. H2 第二节',
      },
    })
    mocks.resolveConfig.mockResolvedValue({
      strategy: 'external-provider',
      apiKey: 'test-key',
      baseURL: 'https://ai.test/v1',
      model: 'chat-model',
      temperature: 0.6,
      maxTokens: 1200,
    })
    mocks.createOpenAICompatible.mockReturnValue({
      chatModel: vi.fn((model: string) => ({ model })),
    })
    mocks.validateUIMessages.mockImplementation(
      async ({ messages }) => messages,
    )
    mocks.convertToModelMessages.mockResolvedValue([
      { role: 'user', content: [{ type: 'text', text: '生成一张配图' }] },
    ])
    mocks.streamText.mockReturnValue({
      toUIMessageStream: vi.fn(() => textStream()),
    })
  })

  it('rejects missing messages before calling the model', async () => {
    mocks.parseJsonBody.mockResolvedValue({})

    const response = await POST(
      new Request('http://test.local/api/editor/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }) as never,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: '缺少 messages 参数',
    })
    expect(mocks.streamText).not.toHaveBeenCalled()
  })

  it('starts the UI stream before model chunks so the client leaves submitted state', async () => {
    const response = await POST(
      new Request('http://test.local/api/editor/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }) as never,
    )
    const body = await response.text()

    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform')
    expect(body).toContain('"type":"start"')
    expect(body).toContain('"type":"data-status"')
    expect(body).toContain('"正在准备上下文"')
    expect(body).toContain('"delta":"你好"')
    expect(mocks.createOpenAICompatible).toHaveBeenCalledWith(
      expect.objectContaining({
        includeUsage: true,
      }),
    )
    expect(mocks.streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        stopWhen: expect.any(Function),
        timeout: {
          totalMs: 300000,
          stepMs: 180000,
          chunkMs: 45000,
        },
        maxRetries: 1,
      }),
    )
  })

  it('allows Anthropic compatible chat profiles without sending temperature', async () => {
    mocks.resolveConfig.mockResolvedValue({
      strategy: 'external-provider',
      apiKey: 'test-key',
      baseURL: 'https://api.aigocode.app/v1',
      model: 'claude-opus-4-8',
      provider: 'aigocode_anthropic',
      providerName: 'AIGoCode (Anthropic)',
      providerType: 'anthropic_compatible',
      temperature: 0.7,
      maxTokens: 1200,
    })

    const response = await POST(
      new Request('http://test.local/api/editor/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }) as never,
    )
    await response.text()

    expect(response.status).toBe(200)
    expect(mocks.createOpenAICompatible).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'test-key',
        baseURL: 'https://api.aigocode.app/v1',
      }),
    )
    expect(mocks.streamText).toHaveBeenCalledWith(
      expect.not.objectContaining({
        temperature: expect.anything(),
      }),
    )
    expect(mocks.streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        maxOutputTokens: 1200,
      }),
    )
  })

  it('does not request streaming usage for OpenRouter chat profiles', async () => {
    mocks.resolveConfig.mockResolvedValue({
      strategy: 'external-provider',
      apiKey: 'test-key',
      baseURL: 'https://openrouter.ai/api/v1',
      model: 'tencent/hy3:free',
      provider: 'openrouter',
      providerName: 'OpenRouter',
      providerType: 'openai_compatible',
      temperature: 0.7,
      maxTokens: 1200,
    })

    const response = await POST(
      new Request('http://test.local/api/editor/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }) as never,
    )
    await response.text()

    expect(response.status).toBe(200)
    expect(mocks.createOpenAICompatible).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'test-key',
        baseURL: 'https://openrouter.ai/api/v1',
        includeUsage: false,
      }),
    )
  })

  it('drops empty assistant placeholders before validating UI messages', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      messages: [
        {
          id: 'user-1',
          role: 'user',
          parts: [{ type: 'text', text: '给出论文亮点' }],
        },
        { id: 'assistant-empty', role: 'assistant', parts: [] },
        {
          id: 'user-2',
          role: 'user',
          parts: [{ type: 'text', text: '我要发 x' }],
        },
      ],
      context: {
        title: '文章标题',
        documentText: '正文内容',
      },
    })

    const response = await POST(
      new Request('http://test.local/api/editor/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }) as never,
    )
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).toContain('"delta":"你好"')
    expect(mocks.validateUIMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            id: 'user-1',
            role: 'user',
            parts: [{ type: 'text', text: '给出论文亮点' }],
          },
          {
            id: 'user-2',
            role: 'user',
            parts: [{ type: 'text', text: '我要发 x' }],
          },
        ],
      }),
    )
  })

  it('exposes a server-side image generation tool that stores images through the existing pipeline', async () => {
    const response = await POST(
      new Request('http://test.local/api/editor/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }) as never,
    )
    await response.text()

    const streamOptions = mocks.streamText.mock.calls[0]?.[0]
    const imageTool = streamOptions.tools.generateArticleImage
    mocks.generateEditorImage.mockResolvedValue(generatedImageResult())

    const result = await imageTool.execute(
      {
        prompt: '给这篇文章生成一张插图',
        aspectRatio: '16:9',
        resolution: '2k',
        placement: 'inline',
        insertTarget: {
          mode: 'section',
          sectionNumber: 2,
        },
      },
      {
        toolCallId: 'tool-image-1',
      },
    )

    expect(mocks.generateEditorImage).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'custom',
        actionLabel: 'AI 对话配图',
        userPrompt: '给这篇文章生成一张插图',
        articleTitle: undefined,
        contextText:
          '目标小节主题参考（仅用于理解主题，不要作为画面文字）：第二节',
        aspectRatio: '16:9',
        resolution: '2k',
        source: 'ai_chat',
        strictUserPrompt: false,
        db: { kind: 'db' },
        env: {
          AI_CONFIG_ENCRYPTION_SECRET: 'secret',
          ADMIN_TOKEN_SALT: 'salt',
          ENABLE_CF_IMAGE_PIPELINE: undefined,
        },
      }),
    )
    expect(result).toEqual(
      expect.objectContaining({
        status: 'success',
        url: '/api/images/image%2Fgenerated.webp',
        alt: '生成图片',
        placement: 'inline',
        insertTarget: {
          mode: 'section',
          sectionNumber: 2,
        },
        assetId: 12,
      }),
    )
    expect(mocks.linkMediaAssetToArticle).toHaveBeenCalledWith(
      { kind: 'db' },
      expect.objectContaining({
        assetId: 12,
        role: 'section',
        sectionNumber: 2,
        toolCallId: 'tool-image-1',
      }),
    )
    expect(mocks.recordAiChatToolAction).toHaveBeenCalledWith(
      { kind: 'db' },
      expect.objectContaining({
        toolCallId: 'tool-image-1',
        actionType: 'insert_image',
        assetId: 12,
        status: 'success',
      }),
    )
  })

  it('keeps the article title for cover images generated from chat', async () => {
    const response = await POST(
      new Request('http://test.local/api/editor/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }) as never,
    )
    await response.text()

    const streamOptions = mocks.streamText.mock.calls[0]?.[0]
    const imageTool = streamOptions.tools.generateArticleImage
    mocks.generateEditorImage.mockResolvedValue(generatedImageResult())

    await imageTool.execute(
      {
        prompt: '给这篇文章生成封面图',
        aspectRatio: '16:9',
        resolution: '2k',
        placement: 'cover',
      },
      {
        toolCallId: 'tool-image-cover',
      },
    )

    expect(mocks.generateEditorImage).toHaveBeenCalledWith(
      expect.objectContaining({
        actionLabel: 'AI 对话封面图',
        userPrompt: '给这篇文章生成封面图',
        articleTitle: '文章标题',
        contextText: '正文内容',
      }),
    )
  })

  it('streams image tool results as persistent data so the chat can render before the tool part settles', async () => {
    mocks.generateEditorImage.mockResolvedValue(generatedImageResult())
    mocks.streamText.mockImplementationOnce((streamOptions) => ({
      toUIMessageStream: vi.fn(
        () =>
          new ReadableStream({
            async start(controller) {
              await streamOptions.tools.generateArticleImage.execute(
                {
                  prompt: '给第二节生成一张科普风格配图',
                  aspectRatio: '16:9',
                  resolution: '2k',
                  placement: 'section',
                  insertTarget: {
                    mode: 'section',
                    sectionNumber: 2,
                  },
                },
                {
                  toolCallId: 'tool-image-stream-1',
                },
              )
              controller.enqueue({ type: 'text-start', id: 'text-1' })
              controller.enqueue({
                type: 'text-delta',
                id: 'text-1',
                delta: '图片已生成',
              })
              controller.enqueue({ type: 'text-end', id: 'text-1' })
              controller.close()
            },
          }),
      ),
    }))

    const response = await POST(
      new Request('http://test.local/api/editor/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }) as never,
    )
    const body = await response.text()

    expect(body).toContain('"type":"data-imageResult"')
    expect(body).toContain('"toolCallId":"tool-image-stream-1"')
    expect(body).toContain('"status":"success"')
    expect(body).toContain('"url":"/api/images/image%2Fgenerated.webp"')
    expect(body).toContain('"sectionNumber":2')
    expect(body).toContain('"delta":"图片已生成"')
  })

  it('exposes client-side editor action tools for conversational edits', async () => {
    const response = await POST(
      new Request('http://test.local/api/editor/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }) as never,
    )
    await response.text()

    const streamOptions = mocks.streamText.mock.calls[0]?.[0]
    expect(streamOptions.tools).toEqual(
      expect.objectContaining({
        setArticleTitle: expect.any(Object),
        setArticleDescription: expect.any(Object),
        setArticleTags: expect.any(Object),
        insertMarkdownIntoArticle: expect.any(Object),
        generateArticleImage: expect.any(Object),
        searchWeb: expect.any(Object),
        fetchPageMarkdown: expect.any(Object),
        fetchTranscript: expect.any(Object),
      }),
    )
    expect(streamOptions.system).toContain('用户说“选第一个标题/用第二个标题”')
    expect(streamOptions.system).toContain('insertTarget')
    expect(streamOptions.system).toContain(
      '默认原则：只在对话中产出内容，不要自动修改文章。',
    )
    expect(streamOptions.system).toContain('诗歌')
    expect(streamOptions.system).toContain(
      '如果用户只要求生成图片但没有文章位置或用途',
    )
    expect(streamOptions.system).toContain('多张文章配图')
    expect(streamOptions.system).toContain('同一轮并行发起多个工具调用')
    expect(streamOptions.system).toContain('当前文章章节索引')
    expect(streamOptions.system).toContain('当前浏览小节')
    expect(streamOptions.system).toContain('当前节/这一节/本节')
    expect(streamOptions.system).toContain('searchWeb')
    expect(streamOptions.system).toContain('fetchPageMarkdown')
    expect(streamOptions.system).toContain('fetchTranscript')
    expect(streamOptions.system).toContain('引用外部信息时必须附来源链接')
    expect(streamOptions.system).toContain('2. H2 第二节')
  })

  it('exposes research tools that delegate to shared helpers', async () => {
    const response = await POST(
      new Request('http://test.local/api/editor/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }) as never,
    )
    await response.text()

    const streamOptions = mocks.streamText.mock.calls[0]?.[0]
    mocks.searchWeb.mockResolvedValue({
      status: 'success',
      query: 'agent skills',
      results: [
        {
          title: 'Agent Skills',
          url: 'https://example.com/skills',
          snippet: 'Open format',
        },
      ],
    })
    mocks.fetchPageMarkdown.mockResolvedValue({
      status: 'success',
      url: 'https://example.com/skills',
      title: 'Agent Skills',
      markdown: '# Agent Skills\n\nContent',
      excerpt: 'Content',
      source: 'jina',
      truncated: false,
    })
    mocks.fetchTranscript.mockResolvedValue({
      status: 'success',
      url: 'https://youtu.be/video-id',
      title: 'Video Transcript',
      platform: 'youtube',
      transcript: 'Transcript content',
      excerpt: 'Transcript content',
      source: 'getnote-web',
      truncated: false,
    })

    const searchResult = await streamOptions.tools.searchWeb.execute(
      {
        query: 'agent skills',
        limit: 20,
      },
      {
        toolCallId: 'tool-search-1',
      },
    )
    const fetchResult = await streamOptions.tools.fetchPageMarkdown.execute(
      {
        url: 'https://example.com/skills',
        maxChars: 24000,
      },
      {
        toolCallId: 'tool-fetch-1',
      },
    )
    const transcriptResult = await streamOptions.tools.fetchTranscript.execute(
      {
        url: 'https://youtu.be/video-id',
        maxChars: 40000,
        maxWaitSeconds: 200,
      },
      {
        toolCallId: 'tool-transcript-1',
      },
    )

    expect(mocks.searchWeb).toHaveBeenCalledWith({
      query: 'agent skills',
      limit: 10,
      env: expect.objectContaining({
        ENABLE_AI_WEB_RESEARCH: 'true',
        PIPELLM_API_KEY: 'pipe-key',
      }),
    })
    expect(mocks.fetchPageMarkdown).toHaveBeenCalledWith({
      url: 'https://example.com/skills',
      maxChars: 20000,
      env: expect.objectContaining({
        ENABLE_AI_WEB_RESEARCH: 'true',
        PIPELLM_API_KEY: 'pipe-key',
      }),
    })
    expect(mocks.fetchTranscript).toHaveBeenCalledWith({
      url: 'https://youtu.be/video-id',
      taskId: undefined,
      noteId: undefined,
      resourceId: undefined,
      maxChars: 30000,
      maxWaitSeconds: 90,
      db: { kind: 'db' },
      env: expect.objectContaining({
        ENABLE_AI_TRANSCRIPT_RESEARCH: 'true',
        ENABLE_AI_WEB_RESEARCH: 'true',
        GETNOTE_API_KEY: 'getnote-key',
        GETNOTE_CLIENT_ID: 'getnote-client',
      }),
      context: {
        sessionId: undefined,
        postId: null,
        slug: '',
      },
    })
    expect(searchResult).toEqual(
      expect.objectContaining({
        status: 'success',
        query: 'agent skills',
      }),
    )
    expect(fetchResult).toEqual(
      expect.objectContaining({
        status: 'success',
        title: 'Agent Skills',
      }),
    )
    expect(transcriptResult).toEqual(
      expect.objectContaining({
        status: 'success',
        title: 'Video Transcript',
      }),
    )
  })

  it('waits briefly by default so GetNote can return note details before falling back to processing', async () => {
    const response = await POST(
      new Request('http://test.local/api/editor/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }) as never,
    )
    await response.text()

    const streamOptions = mocks.streamText.mock.calls[0]?.[0]
    mocks.fetchTranscript.mockResolvedValue({
      status: 'processing',
      url: 'https://www.xiaoyuzhoufm.com/episode/68e8a8fd525f51df3895a239',
      taskId: 'task-1',
      platform: 'xiaoyuzhou',
      message:
        'Get笔记已开始处理音视频文字稿，请稍后再次让 AI 获取该链接内容。',
    })

    const result = await streamOptions.tools.fetchTranscript.execute(
      {
        url: 'https://www.xiaoyuzhoufm.com/episode/68e8a8fd525f51df3895a239',
      },
      {
        toolCallId: 'tool-transcript-processing-1',
      },
    )

    expect(mocks.fetchTranscript).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://www.xiaoyuzhoufm.com/episode/68e8a8fd525f51df3895a239',
        maxChars: 16000,
        maxWaitSeconds: 20,
      }),
    )
    expect(result).toEqual(
      expect.objectContaining({
        status: 'processing',
        taskId: 'task-1',
      }),
    )
  })

  it('strips heading labels from section image context so titles are not treated as renderable copy', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      messages: [
        {
          id: 'user-1',
          role: 'user',
          parts: [{ type: 'text', text: '给第四节生成一张配图' }],
        },
      ],
      context: {
        title: '文章标题',
        documentText: '正文内容',
        sectionToc: '4. H2 触达率暴跌，第一个原因甚至和算法无关',
        currentSection: '4. H2 触达率暴跌，第一个原因甚至和算法无关',
      },
    })
    const response = await POST(
      new Request('http://test.local/api/editor/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }) as never,
    )
    await response.text()

    const streamOptions = mocks.streamText.mock.calls[0]?.[0]
    const imageTool = streamOptions.tools.generateArticleImage
    mocks.generateEditorImage.mockResolvedValue(generatedImageResult())

    await imageTool.execute(
      {
        prompt: '给第四节生成一张配图',
        aspectRatio: '16:9',
        resolution: '2k',
        placement: 'section',
        insertTarget: {
          mode: 'section',
          sectionNumber: 4,
        },
      },
      {
        toolCallId: 'tool-image-section-title',
      },
    )

    const call = mocks.generateEditorImage.mock.calls[0]?.[0]
    expect(call).toEqual(
      expect.objectContaining({
        articleTitle: undefined,
        strictUserPrompt: false,
        contextText:
          '目标小节主题参考（仅用于理解主题，不要作为画面文字）：触达率暴跌，第一个原因甚至和算法无关',
      }),
    )
    expect(call.contextText).not.toContain('H2')
    expect(call.contextText).not.toContain('第 4 节')
  })

  it('forces page markdown fetching when the user explicitly asks to fetch a URL', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      messages: [
        {
          id: 'user-1',
          role: 'user',
          parts: [
            {
              type: 'text',
              text: '抓取 https://x.com/yangyi/status/2048212793116201138 的内容',
            },
          ],
        },
      ],
      context: {
        title: '文章标题',
        documentText: '正文内容',
      },
    })

    const response = await POST(
      new Request('http://test.local/api/editor/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }) as never,
    )
    await response.text()

    const streamOptions = mocks.streamText.mock.calls[0]?.[0]
    await expect(streamOptions.prepareStep({ stepNumber: 0 })).resolves.toEqual(
      {
        activeTools: ['fetchPageMarkdown'],
        toolChoice: { type: 'tool', toolName: 'fetchPageMarkdown' },
      },
    )
    await expect(
      streamOptions.prepareStep({ stepNumber: 1 }),
    ).resolves.toBeUndefined()
  })

  it('forces transcript fetching for supported audio and video URLs', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      messages: [
        {
          id: 'user-1',
          role: 'user',
          parts: [
            {
              type: 'text',
              text: '总结这个 YouTube 视频 https://youtu.be/video-id 的文字稿',
            },
          ],
        },
      ],
      context: {
        title: '文章标题',
        documentText: '正文内容',
      },
    })

    const response = await POST(
      new Request('http://test.local/api/editor/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }) as never,
    )
    await response.text()

    const streamOptions = mocks.streamText.mock.calls[0]?.[0]
    await expect(streamOptions.prepareStep({ stepNumber: 0 })).resolves.toEqual(
      {
        activeTools: ['fetchTranscript'],
        toolChoice: { type: 'tool', toolName: 'fetchTranscript' },
      },
    )
    await expect(
      streamOptions.prepareStep({ stepNumber: 1 }),
    ).resolves.toBeUndefined()
  })

  it('forces insertion after a successful transcript fetch when the user explicitly asks to insert into the article', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      messages: [
        {
          id: 'user-1',
          role: 'user',
          parts: [
            {
              type: 'text',
              text: '读取小宇宙内容，用木羽风格重写一篇文章插入正文：https://www.xiaoyuzhoufm.com/episode/6a333603351c82c12b264c56',
            },
          ],
        },
      ],
      context: {
        title: '文章标题',
        documentText: '',
      },
    })

    const response = await POST(
      new Request('http://test.local/api/editor/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }) as never,
    )
    await response.text()

    const streamOptions = mocks.streamText.mock.calls[0]?.[0]
    await expect(
      streamOptions.prepareStep({ stepNumber: 0, steps: [] }),
    ).resolves.toEqual({
      activeTools: ['fetchTranscript'],
      toolChoice: { type: 'tool', toolName: 'fetchTranscript' },
    })
    await expect(
      streamOptions.prepareStep({
        stepNumber: 1,
        steps: [
          {
            toolResults: [
              {
                toolName: 'fetchTranscript',
                output: {
                  status: 'success',
                  url: 'https://www.xiaoyuzhoufm.com/episode/6a333603351c82c12b264c56',
                  transcript: '节目文字稿',
                },
              },
            ],
          },
        ],
      }),
    ).resolves.toEqual({
      activeTools: ['insertMarkdownIntoArticle'],
      toolChoice: { type: 'tool', toolName: 'insertMarkdownIntoArticle' },
    })
  })

  it('does not force insertion when transcript fetching is still processing', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      messages: [
        {
          id: 'user-1',
          role: 'user',
          parts: [
            {
              type: 'text',
              text: '读取这个播客并插入正文：https://www.xiaoyuzhoufm.com/episode/6a333603351c82c12b264c56',
            },
          ],
        },
      ],
      context: {
        title: '文章标题',
        documentText: '',
      },
    })

    const response = await POST(
      new Request('http://test.local/api/editor/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }) as never,
    )
    await response.text()

    const streamOptions = mocks.streamText.mock.calls[0]?.[0]
    await expect(
      streamOptions.prepareStep({
        stepNumber: 1,
        steps: [
          {
            toolResults: [
              {
                toolName: 'fetchTranscript',
                output: {
                  status: 'processing',
                  url: 'https://www.xiaoyuzhoufm.com/episode/6a333603351c82c12b264c56',
                  taskId: 'task-1',
                },
              },
            ],
          },
        ],
      }),
    ).resolves.toBeUndefined()
  })

  it('does not repeat forced fetches or inserts after the latest user turn already has tool outputs', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      messages: [
        {
          id: 'user-1',
          role: 'user',
          parts: [
            {
              type: 'text',
              text: '读取小宇宙内容，用木羽风格重写一篇文章插入正文：https://www.xiaoyuzhoufm.com/episode/6a333603351c82c12b264c56',
            },
          ],
        },
        {
          id: 'assistant-1',
          role: 'assistant',
          parts: [
            {
              type: 'tool-fetchTranscript',
              toolCallId: 'tool-fetch-1',
              state: 'output-available',
              input: {
                url: 'https://www.xiaoyuzhoufm.com/episode/6a333603351c82c12b264c56',
              },
              output: {
                status: 'success',
                url: 'https://www.xiaoyuzhoufm.com/episode/6a333603351c82c12b264c56',
                transcript: '节目文字稿',
              },
            },
            {
              type: 'tool-insertMarkdownIntoArticle',
              toolCallId: 'tool-insert-1',
              state: 'output-available',
              input: { markdown: '文章正文' },
              output: {
                status: 'success',
                message: '已插入到当前光标位置',
              },
            },
          ],
        },
      ],
      context: {
        title: '文章标题',
        documentText: '文章正文',
      },
    })

    const response = await POST(
      new Request('http://test.local/api/editor/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }) as never,
    )
    await response.text()

    const streamOptions = mocks.streamText.mock.calls[0]?.[0]
    await expect(
      streamOptions.prepareStep({ stepNumber: 0, steps: [] }),
    ).resolves.toBeUndefined()
  })
})
