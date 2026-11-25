import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createCompletion: vi.fn(),
  workersRun: vi.fn(),
  getAiPostGeneratorByTarget: vi.fn(),
  ensureAiPostGeneratorInfrastructure: vi.fn(),
  listAiPostGenerators: vi.fn(),
  resolveAiProfileConfig: vi.fn(),
  resolveAiImageProfileConfig: vi.fn(),
  generateEditorImage: vi.fn(),
}))

vi.mock('openai', () => ({
  default: function OpenAI() {
    return {
      chat: {
        completions: {
          create: mocks.createCompletion,
        },
      },
    }
  },
}))

vi.mock('@/lib/ai-post-generator/storage', () => ({
  ensureAiPostGeneratorInfrastructure:
    mocks.ensureAiPostGeneratorInfrastructure,
  getAiPostGeneratorByTarget: mocks.getAiPostGeneratorByTarget,
  listAiPostGenerators: mocks.listAiPostGenerators,
}))

vi.mock('@/lib/ai-provider-profiles', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/ai-provider-profiles')
  >('@/lib/ai-provider-profiles')
  return {
    ...actual,
    resolveAiProfileConfig: mocks.resolveAiProfileConfig,
  }
})

vi.mock('@/lib/ai-image-config', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai-image-config')>(
    '@/lib/ai-image-config',
  )
  return {
    ...actual,
    resolveAiImageProfileConfig: mocks.resolveAiImageProfileConfig,
  }
})

vi.mock('@/lib/ai-image', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/ai-image')>('@/lib/ai-image')
  return {
    ...actual,
    generateEditorImage: mocks.generateEditorImage,
  }
})

import {
  generatePostCover,
  generatePostMetadata,
} from '@/lib/ai-post-generators'

describe('ai-post-generators', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retries external-provider tag generation when the first response contains reasoning only', async () => {
    mocks.getAiPostGeneratorByTarget.mockResolvedValue({
      id: 2,
      target_key: 'tags',
      label: '标签生成',
      description: '生成标签',
      prompt: '提取标签',
      provider_mode: 'profile',
      text_profile_id: 2,
      image_profile_id: null,
      workers_model: '',
      temperature: 0.3,
      max_tokens: 180,
      aspect_ratio: '16:9',
      resolution: '2k',
      is_enabled: 1,
      is_builtin: 1,
      created_at: 0,
      updated_at: 0,
    })
    mocks.resolveAiProfileConfig.mockResolvedValue({
      id: 2,
      name: '文本模型',
      provider: 'custom',
      provider_name: 'Custom',
      provider_type: 'openai_compatible',
      provider_category: '',
      api_key_url: '',
      base_url: 'https://example.com/v1',
      model: 'test-model',
      temperature: 0.7,
      max_tokens: 1200,
      api_key: 'test-key',
      api_key_masked: 'test***',
      is_default: 1,
    })
    mocks.createCompletion
      .mockResolvedValueOnce({
        choices: [
          {
            finish_reason: 'length',
            message: {
              content: '',
              reasoning: '先分析标签候选',
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: '{"tags":["AI写作","提示词设计","自动化工作流"]}',
            },
          },
        ],
      })

    const result = await generatePostMetadata({
      target: 'tags',
      title: '测试标题',
      content: '这篇文章讨论 AI 写作编辑器、提示词设计和自动化工作流。',
      category: 'AI',
      description: '',
      tags: [],
      currentSlug: '',
      db: {} as D1Database,
      env: {} as Partial<CloudflareEnv>,
    })

    expect(result.value).toEqual(['AI写作', '提示词设计', '自动化工作流'])
    expect(mocks.createCompletion).toHaveBeenCalledTimes(2)
  })

  it('retries workers-ai slug generation when the first response contains reasoning only', async () => {
    mocks.getAiPostGeneratorByTarget.mockResolvedValue({
      id: 3,
      target_key: 'slug',
      label: 'Slug 生成',
      description: '生成 slug',
      prompt: '生成 slug',
      provider_mode: 'workers_ai',
      text_profile_id: null,
      image_profile_id: null,
      workers_model: '@cf/zai-org/glm-4.7-flash',
      temperature: 0.2,
      max_tokens: 80,
      aspect_ratio: '16:9',
      resolution: '2k',
      is_enabled: 1,
      is_builtin: 1,
      created_at: 0,
      updated_at: 0,
    })
    mocks.workersRun
      .mockResolvedValueOnce({
        choices: [
          {
            finish_reason: 'length',
            message: {
              content: null,
              reasoning: '先分析标题语义',
              reasoning_content: '先分析标题语义',
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: '{"slug":"testing-ai-writing-editor"}',
            },
          },
        ],
      })

    const result = await generatePostMetadata({
      target: 'slug',
      title: '测试 AI 写作编辑器',
      content: '这篇文章讨论 AI 写作编辑器、提示词设计和自动化工作流。',
      category: 'AI',
      description: '',
      tags: [],
      currentSlug: '',
      db: {} as D1Database,
      env: {
        WORKERS_AI: {
          run: mocks.workersRun,
        } as unknown as WorkersAIBinding,
        ENABLE_WORKERS_AI: 'true',
      } as Partial<CloudflareEnv>,
    })

    expect(result.value).toBe('testing-ai-writing-editor')
    expect(mocks.workersRun).toHaveBeenCalledTimes(2)
  })

  it('extracts tags from tool call arguments when content is empty', async () => {
    mocks.getAiPostGeneratorByTarget.mockResolvedValue({
      id: 2,
      target_key: 'tags',
      label: '标签生成',
      description: '生成标签',
      prompt: '提取标签',
      provider_mode: 'profile',
      text_profile_id: 2,
      image_profile_id: null,
      workers_model: '',
      temperature: 0.3,
      max_tokens: 180,
      aspect_ratio: '16:9',
      resolution: '2k',
      is_enabled: 1,
      is_builtin: 1,
      created_at: 0,
      updated_at: 0,
    })
    mocks.resolveAiProfileConfig.mockResolvedValue({
      id: 2,
      name: '文本模型',
      provider: 'custom',
      provider_name: 'Custom',
      provider_type: 'openai_compatible',
      provider_category: '',
      api_key_url: '',
      base_url: 'https://example.com/v1',
      model: 'test-model',
      temperature: 0.7,
      max_tokens: 1200,
      api_key: 'test-key',
      api_key_masked: 'test***',
      is_default: 1,
    })
    mocks.createCompletion.mockResolvedValueOnce({
      choices: [
        {
          finish_reason: 'tool_calls',
          message: {
            content: null,
            tool_calls: [
              {
                function: {
                  arguments: '{"tags":["AI写作","提示词设计","自动化工作流"]}',
                },
              },
            ],
          },
        },
      ],
    })

    const result = await generatePostMetadata({
      target: 'tags',
      title: '测试标题',
      content: '这篇文章讨论 AI 写作编辑器、提示词设计和自动化工作流。',
      category: 'AI',
      description: '',
      tags: [],
      currentSlug: '',
      db: {} as D1Database,
      env: {} as Partial<CloudflareEnv>,
    })

    expect(result.value).toEqual(['AI写作', '提示词设计', '自动化工作流'])
    expect(mocks.createCompletion).toHaveBeenCalledTimes(1)
  })

  it('extracts a slug from workers-ai tool call arguments when content is empty', async () => {
    mocks.getAiPostGeneratorByTarget.mockResolvedValue({
      id: 3,
      target_key: 'slug',
      label: 'Slug 生成',
      description: '生成 slug',
      prompt: '生成 slug',
      provider_mode: 'workers_ai',
      text_profile_id: null,
      image_profile_id: null,
      workers_model: '@cf/zai-org/glm-4.7-flash',
      temperature: 0.2,
      max_tokens: 80,
      aspect_ratio: '16:9',
      resolution: '2k',
      is_enabled: 1,
      is_builtin: 1,
      created_at: 0,
      updated_at: 0,
    })
    mocks.workersRun.mockResolvedValueOnce({
      choices: [
        {
          finish_reason: 'tool_calls',
          message: {
            content: null,
            tool_calls: [
              {
                function: {
                  arguments: '{"slug":"testing-ai-writing-editor"}',
                },
              },
            ],
          },
        },
      ],
    })

    const result = await generatePostMetadata({
      target: 'slug',
      title: '测试 AI 写作编辑器',
      content: '这篇文章讨论 AI 写作编辑器、提示词设计和自动化工作流。',
      category: 'AI',
      description: '',
      tags: [],
      currentSlug: '',
      db: {} as D1Database,
      env: {
        WORKERS_AI: {
          run: mocks.workersRun,
        } as unknown as WorkersAIBinding,
        ENABLE_WORKERS_AI: 'true',
      } as Partial<CloudflareEnv>,
    })

    expect(result.value).toBe('testing-ai-writing-editor')
    expect(mocks.workersRun).toHaveBeenCalledTimes(1)
  })

  it('retries cover generation with the default image profile after a transient provider failure', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const generatedImage = {
      key: 'image/2026/06/ai-cover-test.webp',
      url: '/api/images/image%2F2026%2F06%2Fai-cover-test.webp',
      variants: {
        raw: '/api/images/image%2F2026%2F06%2Fai-cover-test.webp',
        content: '/api/images/image%2F2026%2F06%2Fai-cover-test.webp?w=1600',
        thumb: '/api/images/image%2F2026%2F06%2Fai-cover-test.webp?w=320',
        cover:
          '/api/images/image%2F2026%2F06%2Fai-cover-test.webp?w=1600&h=900',
      },
      prompt: '封面 prompt',
      revisedPrompt: '封面 prompt',
      alt: '封面',
      actionLabel: '封面生成',
      aspectRatio: '16:9',
      resolution: '1k',
      size: '1024x576',
      profileName: 'HiAPI-GPT-IMG-2',
      model: 'gpt-image-2-beta',
      mimeType: 'image/webp',
      sizeBytes: 120,
      assetId: 10,
    }

    try {
      mocks.getAiPostGeneratorByTarget.mockResolvedValue({
        id: 4,
        target_key: 'cover',
        label: '封面生成',
        description: '生成封面',
        prompt: '生成文章封面',
        provider_mode: 'profile',
        text_profile_id: null,
        image_profile_id: 3,
        workers_model: '',
        temperature: 0.2,
        max_tokens: 120,
        aspect_ratio: '16:9',
        resolution: '1k',
        is_enabled: 1,
        is_builtin: 1,
        created_at: 0,
        updated_at: 0,
      })
      mocks.resolveAiImageProfileConfig
        .mockResolvedValueOnce({
          id: 3,
          name: '兔子GPT-IMG-2',
          provider: 'tuzi',
          provider_name: '兔子 API',
          provider_type: 'openai_images',
          provider_category: '',
          api_key_url: '',
          base_url: 'https://api.tu-zi.com/v1',
          model: 'gpt-image-2',
          api_key: 'primary-key',
          api_key_masked: 'sk-***',
          is_default: 0,
        })
        .mockResolvedValueOnce({
          id: 4,
          name: 'HiAPI-GPT-IMG-2',
          provider: 'custom',
          provider_name: 'HiAPI',
          provider_type: 'openai_images',
          provider_category: '',
          api_key_url: '',
          base_url: 'https://api.hiapi.ai/v1',
          model: 'gpt-image-2-beta',
          api_key: 'fallback-key',
          api_key_masked: 'sk-***',
          is_default: 1,
        })
      mocks.generateEditorImage
        .mockRejectedValueOnce(new Error('error code: 525'))
        .mockResolvedValueOnce(generatedImage)

      const result = await generatePostCover({
        title: 'Ask AI 封面',
        content: '正文内容',
        category: 'AI',
        description: '',
        tags: [],
        db: {} as D1Database,
        images: { put: vi.fn() },
        env: {},
      })

      expect(result.image).toBe(generatedImage)
      expect(mocks.generateEditorImage).toHaveBeenCalledTimes(2)
      expect(mocks.generateEditorImage).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          action: 'custom',
          articleTitle: 'Ask AI 封面',
          profileId: 3,
          source: 'cover_generator',
        }),
      )
      expect(mocks.generateEditorImage).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          action: 'custom',
          articleTitle: 'Ask AI 封面',
          profileId: 4,
          source: 'cover_generator',
        }),
      )
      expect(warn).toHaveBeenCalledWith(
        '[ai-post-cover] Primary image profile failed; retrying with default profile',
        expect.objectContaining({
          profileId: 3,
          fallbackProfileId: 4,
          error: 'error code: 525',
        }),
      )
    } finally {
      warn.mockRestore()
    }
  })
})
