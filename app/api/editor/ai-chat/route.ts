import type { NextRequest } from 'next/server'
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  jsonSchema,
  stepCountIs,
  streamText,
  tool,
  validateUIMessages,
  type UIMessage,
  type UIMessageStreamWriter,
} from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { getAiRuntimeEnv, resolveConfig } from '@/lib/ai'
import { isAnthropicCompatibleConfig } from '@/lib/anthropic-compatible'
import { generateEditorImage } from '@/lib/ai-image'
import {
  fetchTranscript,
  isSupportedTranscriptUrl,
  type FetchTranscriptOutput,
} from '@/lib/ai-transcript-research'
import {
  fetchPageMarkdown,
  searchWeb,
  type FetchPageMarkdownOutput,
  type WebSearchOutput,
} from '@/lib/ai-web-research'
import {
  linkMediaAssetToArticle,
  recordAiChatToolAction,
} from '@/lib/repositories/media-assets'
import {
  ensureAuthenticatedRequest,
  getRouteEnvWithDb,
  jsonError,
  parseJsonBody,
} from '@/lib/server/route-helpers'

export const maxDuration = 300

type EditorChatContext = {
  title?: string
  documentText?: string
  sectionToc?: string
  currentSection?: string
  selectedText?: string
  description?: string
  category?: string
  tags?: string[]
  slug?: string
  postId?: number | null
}

type EditorChatRequestBody = {
  messages?: EditorChatUIMessage[]
  context?: EditorChatContext
  sessionId?: string
  profileId?: number | null
  imageProfileId?: number | null
}

type ImageBucket = {
  put: (
    key: string,
    value: File | ArrayBuffer | ArrayBufferView | ReadableStream,
    options?: {
      httpMetadata?: {
        contentType?: string
        cacheControl?: string
      }
      customMetadata?: Record<string, string>
    },
  ) => Promise<void>
}

type EditorChatStatusData = {
  label: string
  stage: 'preparing' | 'connecting' | 'thinking' | 'image' | 'done'
}

type EditorChatImageResultData = {
  toolCallId: string
  output: GenerateArticleImageOutput
}

type GenerateArticleImageInput = {
  prompt: string
  aspectRatio?:
    | 'auto'
    | '21:9'
    | '16:9'
    | '3:2'
    | '4:3'
    | '1:1'
    | '3:4'
    | '2:3'
    | '9:16'
  resolution?: 'auto' | '1k' | '2k' | '4k'
  placement?: 'inline' | 'cover' | 'section'
  insertTarget?: ImageInsertTarget
  alt?: string
}

type SearchWebInput = {
  query: string
  limit?: number
}

type FetchPageMarkdownInput = {
  url: string
  maxChars?: number
}

type FetchTranscriptInput = {
  url?: string
  taskId?: string
  noteId?: string
  resourceId?: number
  maxChars?: number
  maxWaitSeconds?: number
}

type ReadArticleContentInput = {
  scope?: 'all' | 'selection'
  maxChars?: number
}

type ReadArticleContentOutput = {
  status: 'success' | 'error'
  message: string
  scope: 'all' | 'selection'
  content: string
  charCount: number
  truncated: boolean
  title: string
  sectionToc: string
  currentSection: string
  selectedText: string
}

type ImageInsertTarget = {
  mode: 'cursor' | 'section'
  sectionNumber?: number
  sectionTitle?: string
}

type EditorToolOutput = {
  status: 'success' | 'error'
  message: string
}

type OpenAiCompatibleRuntimeConfig = {
  provider?: string
  providerName?: string
  baseURL?: string
}

type SetArticleTitleInput = {
  title: string
}

type SetArticleDescriptionInput = {
  description: string
}

type SetArticleTagsInput = {
  tags: string[]
}

type InsertMarkdownInput = {
  markdown: string
  target?: {
    mode: 'cursor' | 'section'
    sectionNumber?: number
    sectionTitle?: string
  }
}

type EditArticleContentInput = {
  action: 'replace' | 'delete'
  target: {
    mode: 'selection' | 'exactText' | 'all'
    exactText?: string
    occurrence?: number
    useLastMatch?: boolean
  }
  replacementMarkdown?: string
  expectedText?: string
}

type GenerateArticleImageOutput =
  | {
      status: 'success'
      url: string
      variants: {
        raw: string
        content: string
        thumb: string
        cover: string
      }
      alt: string
      prompt: string
      revisedPrompt: string
      aspectRatio: string
      resolution: string
      actionLabel: string
      placement: 'inline' | 'cover' | 'section'
      insertTarget?: ImageInsertTarget
      model: string
      profileName: string
      assetId?: number
    }
  | {
      status: 'error'
      error: string
      prompt: string
      aspectRatio: string
      resolution: string
      placement: 'inline' | 'cover' | 'section'
      insertTarget?: ImageInsertTarget
    }

type EditorChatTools = {
  readArticleContent: {
    input: ReadArticleContentInput
    output: ReadArticleContentOutput
  }
  setArticleTitle: {
    input: SetArticleTitleInput
    output: EditorToolOutput
  }
  setArticleDescription: {
    input: SetArticleDescriptionInput
    output: EditorToolOutput
  }
  setArticleTags: {
    input: SetArticleTagsInput
    output: EditorToolOutput
  }
  insertMarkdownIntoArticle: {
    input: InsertMarkdownInput
    output: EditorToolOutput
  }
  editArticleContent: {
    input: EditArticleContentInput
    output: EditorToolOutput
  }
  generateArticleImage: {
    input: GenerateArticleImageInput
    output: GenerateArticleImageOutput
  }
  searchWeb: {
    input: SearchWebInput
    output: WebSearchOutput
  }
  fetchPageMarkdown: {
    input: FetchPageMarkdownInput
    output: FetchPageMarkdownOutput
  }
  fetchTranscript: {
    input: FetchTranscriptInput
    output: FetchTranscriptOutput
  }
}

type EditorChatUIMessage = UIMessage<
  never,
  {
    status: EditorChatStatusData
    imageResult: EditorChatImageResultData
  },
  EditorChatTools
>

type EditorChatToolFactoryInput = {
  db: D1Database
  imageEnv: Record<string, string | undefined>
  webResearchEnv: Record<string, string | undefined>
  transcriptResearchEnv: Record<string, string | undefined>
  images?: ImageBucket
  context: Required<EditorChatContext>
  sessionId?: string
  imageProfileId?: number
  writeStatus?: (status: EditorChatStatusData) => void
  writeImageResult?: (
    toolCallId: string,
    output: GenerateArticleImageOutput,
  ) => void
}

const MAX_CONTEXT_CHARS = 12000
const MAX_SELECTED_CHARS = 4000
const MAX_SEARCH_QUERY_CHARS = 300
const MAX_FETCH_URL_CHARS = 2000
const DEFAULT_FETCH_MARKDOWN_CHARS = 12000
const DEFAULT_FETCH_TRANSCRIPT_CHARS = 16000
const DEFAULT_FETCH_TRANSCRIPT_WAIT_SECONDS = 20
const DEFAULT_READ_ARTICLE_CHARS = 16000
const EDITOR_CHAT_MAX_STEPS = 8
const EDITOR_CHAT_TIMEOUT = {
  totalMs: 300000,
  stepMs: 180000,
  chunkMs: 45000,
}
const ASPECT_RATIOS: Array<
  NonNullable<GenerateArticleImageInput['aspectRatio']>
> = ['auto', '21:9', '16:9', '3:2', '4:3', '1:1', '3:4', '2:3', '9:16']
const RESOLUTIONS: Array<NonNullable<GenerateArticleImageInput['resolution']>> =
  ['auto', '1k', '2k', '4k']
const PLACEMENTS: Array<NonNullable<GenerateArticleImageInput['placement']>> = [
  'inline',
  'cover',
  'section',
]
const INSERT_TARGET_MODES: Array<ImageInsertTarget['mode']> = [
  'cursor',
  'section',
]
const ARTICLE_READ_SCOPES: Array<
  NonNullable<ReadArticleContentInput['scope']>
> = ['all', 'selection']
const ARTICLE_EDIT_ACTIONS: Array<EditArticleContentInput['action']> = [
  'replace',
  'delete',
]
const ARTICLE_EDIT_TARGET_MODES: Array<
  EditArticleContentInput['target']['mode']
> = ['selection', 'exactText', 'all']

function trimText(value: unknown, maxChars: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxChars) : ''
}

function normalizeContext(
  input?: EditorChatContext,
): Required<EditorChatContext> {
  return {
    title: trimText(input?.title, 200),
    documentText: trimText(input?.documentText, MAX_CONTEXT_CHARS),
    sectionToc: trimText(input?.sectionToc, 3000),
    currentSection: trimText(input?.currentSection, 300),
    selectedText: trimText(input?.selectedText, MAX_SELECTED_CHARS),
    description: trimText(input?.description, 500),
    category: trimText(input?.category, 80),
    tags: Array.isArray(input?.tags)
      ? input.tags
          .map((tag) => trimText(tag, 40))
          .filter(Boolean)
          .slice(0, 12)
      : [],
    slug: trimText(input?.slug, 160),
    postId:
      Number.isInteger(input?.postId) && Number(input?.postId) > 0
        ? Number(input?.postId)
        : null,
  }
}

function sanitizeAiErrorMessage(error: unknown, fallback = 'AI 对话失败') {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : fallback
  const message = raw
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, 'sk-[redacted]')
    .replace(/\s+/g, ' ')
    .trim()

  return message || fallback
}

function normalizeImageToolInput(
  value: unknown,
): GenerateArticleImageInput | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  const prompt = trimText(input.prompt, 1800)
  if (!prompt) return null

  const aspectRatio = ASPECT_RATIOS.includes(
    input.aspectRatio as NonNullable<GenerateArticleImageInput['aspectRatio']>,
  )
    ? (input.aspectRatio as NonNullable<
        GenerateArticleImageInput['aspectRatio']
      >)
    : 'auto'
  const resolution = RESOLUTIONS.includes(
    input.resolution as NonNullable<GenerateArticleImageInput['resolution']>,
  )
    ? (input.resolution as NonNullable<GenerateArticleImageInput['resolution']>)
    : 'auto'
  const placement = PLACEMENTS.includes(
    input.placement as NonNullable<GenerateArticleImageInput['placement']>,
  )
    ? (input.placement as NonNullable<GenerateArticleImageInput['placement']>)
    : 'inline'
  const alt = trimText(input.alt, 120)
  const insertTarget = normalizeInsertTarget(input.insertTarget)

  return {
    prompt,
    aspectRatio,
    resolution,
    placement,
    insertTarget,
    alt: alt || undefined,
  }
}

function normalizeSearchWebInput(value: unknown): SearchWebInput | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  const query = trimText(input.query, MAX_SEARCH_QUERY_CHARS)
  if (!query) return null
  const parsedLimit =
    typeof input.limit === 'number'
      ? input.limit
      : typeof input.limit === 'string'
        ? Number.parseInt(input.limit, 10)
        : Number.NaN
  const limit = Number.isInteger(parsedLimit)
    ? Math.max(1, Math.min(10, parsedLimit))
    : undefined
  return { query, limit }
}

function normalizeFetchPageMarkdownInput(
  value: unknown,
): FetchPageMarkdownInput | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  const url = trimText(input.url, MAX_FETCH_URL_CHARS)
  if (!url) return null
  const parsedMaxChars =
    typeof input.maxChars === 'number'
      ? input.maxChars
      : typeof input.maxChars === 'string'
        ? Number.parseInt(input.maxChars, 10)
        : Number.NaN
  const maxChars = Number.isInteger(parsedMaxChars)
    ? Math.max(1000, Math.min(20000, parsedMaxChars))
    : DEFAULT_FETCH_MARKDOWN_CHARS
  return { url, maxChars }
}

function normalizeFetchTranscriptInput(
  value: unknown,
): FetchTranscriptInput | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  const url = trimText(input.url, MAX_FETCH_URL_CHARS)
  const taskId = trimText(input.taskId, 120)
  const noteId = trimText(input.noteId, 120)
  const parsedResourceId =
    typeof input.resourceId === 'number'
      ? input.resourceId
      : typeof input.resourceId === 'string'
        ? Number.parseInt(input.resourceId, 10)
        : Number.NaN
  const resourceId =
    Number.isInteger(parsedResourceId) && parsedResourceId > 0
      ? parsedResourceId
      : undefined
  if (!url && !taskId && !noteId && !resourceId) return null
  const parsedMaxChars =
    typeof input.maxChars === 'number'
      ? input.maxChars
      : typeof input.maxChars === 'string'
        ? Number.parseInt(input.maxChars, 10)
        : Number.NaN
  const maxChars = Number.isInteger(parsedMaxChars)
    ? Math.max(1000, Math.min(30000, parsedMaxChars))
    : DEFAULT_FETCH_TRANSCRIPT_CHARS
  const parsedMaxWaitSeconds =
    typeof input.maxWaitSeconds === 'number'
      ? input.maxWaitSeconds
      : typeof input.maxWaitSeconds === 'string'
        ? Number.parseInt(input.maxWaitSeconds, 10)
        : Number.NaN
  const maxWaitSeconds = Number.isInteger(parsedMaxWaitSeconds)
    ? Math.max(0, Math.min(90, parsedMaxWaitSeconds))
    : DEFAULT_FETCH_TRANSCRIPT_WAIT_SECONDS
  return {
    url: url || undefined,
    taskId: taskId || undefined,
    noteId: noteId || undefined,
    resourceId,
    maxChars,
    maxWaitSeconds,
  }
}

function normalizeReadArticleContentInput(
  value: unknown,
): ReadArticleContentInput {
  const input =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const scope = ARTICLE_READ_SCOPES.includes(
    input.scope as NonNullable<ReadArticleContentInput['scope']>,
  )
    ? (input.scope as NonNullable<ReadArticleContentInput['scope']>)
    : 'all'
  const parsedMaxChars =
    typeof input.maxChars === 'number'
      ? input.maxChars
      : typeof input.maxChars === 'string'
        ? Number.parseInt(input.maxChars, 10)
        : Number.NaN
  const maxChars = Number.isInteger(parsedMaxChars)
    ? Math.max(1000, Math.min(30000, parsedMaxChars))
    : DEFAULT_READ_ARTICLE_CHARS
  return { scope, maxChars }
}

function normalizeInsertTarget(value: unknown): ImageInsertTarget | undefined {
  if (!value || typeof value !== 'object') return undefined
  const input = value as Record<string, unknown>
  const mode = INSERT_TARGET_MODES.includes(
    input.mode as ImageInsertTarget['mode'],
  )
    ? (input.mode as ImageInsertTarget['mode'])
    : 'cursor'
  const rawSectionNumber = Number(input.sectionNumber)
  const sectionNumber =
    Number.isInteger(rawSectionNumber) &&
    rawSectionNumber > 0 &&
    rawSectionNumber <= 50
      ? rawSectionNumber
      : undefined
  const sectionTitle = trimText(input.sectionTitle, 120)

  return {
    mode,
    sectionNumber,
    sectionTitle: sectionTitle || undefined,
  }
}

function isSectionImageRequest(
  input: Pick<GenerateArticleImageInput, 'placement' | 'insertTarget'>,
) {
  return input.placement === 'section' || input.insertTarget?.mode === 'section'
}

function cleanSectionTitleForImage(value: string) {
  return value
    .trim()
    .replace(/^\d+\.\s*H[1-6]\s+/i, '')
    .replace(/^H[1-6]\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function findSectionTitleInToc(sectionToc: string, target?: ImageInsertTarget) {
  const wantedNumber = target?.sectionNumber
  const wantedTitle = target?.sectionTitle?.trim()
  if (!sectionToc.trim() || (!wantedNumber && !wantedTitle)) return ''

  for (const line of sectionToc.split('\n')) {
    const normalizedLine = line.trim()
    if (!normalizedLine) continue

    const match = normalizedLine.match(/^(\d+)\.\s*H[1-6]\s+(.+)$/i)
    const lineNumber = match ? Number(match[1]) : undefined
    const lineTitle = cleanSectionTitleForImage(match?.[2] || normalizedLine)
    if (!lineTitle) continue

    if (wantedNumber && lineNumber === wantedNumber) return lineTitle
    if (wantedTitle && lineTitle.includes(wantedTitle)) return lineTitle
  }

  return ''
}

function buildImageSectionReference(label: string, value: string) {
  const title = cleanSectionTitleForImage(value)
  return title ? `${label}（仅用于理解主题，不要作为画面文字）：${title}` : ''
}

function buildImageGenerationContext(
  input: GenerateArticleImageInput,
  context: Required<EditorChatContext>,
) {
  const isSectionImage = isSectionImageRequest(input)
  const defaultContextText =
    context.selectedText ||
    context.description ||
    context.documentText.slice(0, 1800)
  const articleTitle =
    input.placement === 'cover' || (!isSectionImage && !defaultContextText)
      ? context.title || undefined
      : undefined
  const targetSectionTitle =
    input.insertTarget?.sectionTitle ||
    findSectionTitleInToc(context.sectionToc, input.insertTarget)
  const currentSectionTitle = cleanSectionTitleForImage(context.currentSection)
  const sectionContext = [
    targetSectionTitle
      ? buildImageSectionReference('目标小节主题参考', targetSectionTitle)
      : '',
    currentSectionTitle &&
    currentSectionTitle !== cleanSectionTitleForImage(targetSectionTitle || '')
      ? buildImageSectionReference('当前浏览小节主题参考', currentSectionTitle)
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  if (isSectionImage) {
    return {
      articleTitle,
      contextText: context.selectedText || sectionContext || defaultContextText,
    }
  }

  return {
    articleTitle,
    contextText: defaultContextText,
  }
}

function normalizeSetArticleTitleInput(
  value: unknown,
): SetArticleTitleInput | null {
  if (!value || typeof value !== 'object') return null
  const title = trimText((value as Record<string, unknown>).title, 200)
  return title ? { title } : null
}

function normalizeSetArticleDescriptionInput(
  value: unknown,
): SetArticleDescriptionInput | null {
  if (!value || typeof value !== 'object') return null
  const description = trimText(
    (value as Record<string, unknown>).description,
    500,
  )
  return description ? { description } : null
}

function normalizeSetArticleTagsInput(
  value: unknown,
): SetArticleTagsInput | null {
  if (!value || typeof value !== 'object') return null
  const rawTags = (value as Record<string, unknown>).tags
  if (!Array.isArray(rawTags)) return null
  const tags = rawTags
    .map((tag) => trimText(tag, 40))
    .filter(Boolean)
    .slice(0, 10)
  return tags.length > 0 ? { tags } : null
}

function normalizeInsertMarkdownInput(
  value: unknown,
): InsertMarkdownInput | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  const markdown = trimText(input.markdown, 12000)
  if (!markdown) return null
  return {
    markdown,
    target: normalizeInsertTarget(input.target),
  }
}

function normalizeEditArticleContentInput(
  value: unknown,
): EditArticleContentInput | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  const action = ARTICLE_EDIT_ACTIONS.includes(
    input.action as EditArticleContentInput['action'],
  )
    ? (input.action as EditArticleContentInput['action'])
    : null
  const rawTarget =
    input.target && typeof input.target === 'object'
      ? (input.target as Record<string, unknown>)
      : null
  const mode =
    rawTarget &&
    ARTICLE_EDIT_TARGET_MODES.includes(
      rawTarget.mode as EditArticleContentInput['target']['mode'],
    )
      ? (rawTarget.mode as EditArticleContentInput['target']['mode'])
      : null

  if (!action || !mode) return null
  if (action === 'delete' && mode === 'all') return null

  const exactText = trimText(rawTarget?.exactText, 12000)
  if (mode === 'exactText' && !exactText) return null

  const replacementMarkdown = trimText(input.replacementMarkdown, 12000)
  if (action === 'replace' && !replacementMarkdown) return null

  const rawOccurrence = Number(rawTarget?.occurrence)
  const occurrence =
    Number.isInteger(rawOccurrence) && rawOccurrence > 0 && rawOccurrence <= 50
      ? rawOccurrence
      : undefined
  const useLastMatch = rawTarget?.useLastMatch === true
  const expectedText = trimText(input.expectedText, 12000)

  return {
    action,
    target: {
      mode,
      exactText: exactText || undefined,
      occurrence,
      useLastMatch: useLastMatch || undefined,
    },
    replacementMarkdown: replacementMarkdown || undefined,
    expectedText: expectedText || undefined,
  }
}

const generateArticleImageInputSchema = jsonSchema<GenerateArticleImageInput>(
  {
    type: 'object',
    additionalProperties: false,
    required: ['prompt'],
    properties: {
      prompt: {
        type: 'string',
        minLength: 4,
        maxLength: 1800,
        description:
          '图片主题、画面内容和必要风格。必须结合当前文章语境，避免只写空泛风格词。',
      },
      aspectRatio: {
        type: 'string',
        enum: ASPECT_RATIOS,
        description:
          '图片比例。正文配图优先 16:9 或 3:2，封面优先 16:9，移动海报可用 9:16。',
      },
      resolution: {
        type: 'string',
        enum: RESOLUTIONS,
        description: '清晰度偏好。未明确要求时用 auto。',
      },
      placement: {
        type: 'string',
        enum: PLACEMENTS,
        description:
          '图片用途：inline 为正文插图，cover 为封面，section 为章节图。小节图只围绕该小节，不要把文章标题作为画面文字或主视觉。',
      },
      insertTarget: {
        type: 'object',
        additionalProperties: false,
        properties: {
          mode: {
            type: 'string',
            enum: INSERT_TARGET_MODES,
            description:
              '插入位置：cursor 插入当前光标处，section 插入指定章节标题后。',
          },
          sectionNumber: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            description:
              '章节序号，从正文第一个二级/三级标题开始计数。用户说“第二节”时传 2。',
          },
          sectionTitle: {
            type: 'string',
            maxLength: 120,
            description: '章节标题关键词。用户点名章节标题时填写。',
          },
        },
        description: '如果用户要求把图片插到某一节，必须传 section 目标。',
      },
      alt: {
        type: 'string',
        maxLength: 120,
        description: '给文章图片使用的简短替代文本。',
      },
    },
  },
  {
    validate(value) {
      const normalized = normalizeImageToolInput(value)
      return normalized
        ? { success: true, value: normalized }
        : { success: false, error: new Error('图片生成参数不完整') }
    },
  },
)

const searchWebInputSchema = jsonSchema<SearchWebInput>(
  {
    type: 'object',
    additionalProperties: false,
    required: ['query'],
    properties: {
      query: {
        type: 'string',
        minLength: 1,
        maxLength: MAX_SEARCH_QUERY_CHARS,
        description:
          '要搜索的关键词。优先使用具体、可检索的问题，而不是泛泛主题。',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 10,
        description: '返回结果数量，默认 5，最多 10。',
      },
    },
  },
  {
    validate(value) {
      const normalized = normalizeSearchWebInput(value)
      return normalized
        ? { success: true, value: normalized }
        : { success: false, error: new Error('搜索关键词不能为空') }
    },
  },
)

const fetchPageMarkdownInputSchema = jsonSchema<FetchPageMarkdownInput>(
  {
    type: 'object',
    additionalProperties: false,
    required: ['url'],
    properties: {
      url: {
        type: 'string',
        minLength: 8,
        maxLength: MAX_FETCH_URL_CHARS,
        description:
          '要读取并转成 Markdown 的公开网页 URL。只支持 http/https。',
      },
      maxChars: {
        type: 'integer',
        minimum: 1000,
        maximum: 20000,
        description: '最多返回的 Markdown 字符数，默认 12000，最多 20000。',
      },
    },
  },
  {
    validate(value) {
      const normalized = normalizeFetchPageMarkdownInput(value)
      return normalized
        ? { success: true, value: normalized }
        : { success: false, error: new Error('URL 不能为空') }
    },
  },
)

const fetchTranscriptInputSchema = jsonSchema<FetchTranscriptInput>(
  {
    type: 'object',
    additionalProperties: false,
    properties: {
      url: {
        type: 'string',
        minLength: 8,
        maxLength: MAX_FETCH_URL_CHARS,
        description:
          '要获取文字稿的公开音视频 URL。支持小宇宙、YouTube、B站等由 Get笔记处理的链接。',
      },
      taskId: {
        type: 'string',
        maxLength: 120,
        description: 'Get笔记任务 ID。用户要求继续获取刚才的转写任务时可用。',
      },
      noteId: {
        type: 'string',
        maxLength: 120,
        description:
          'Get笔记 note ID。已拿到 noteId 时可直接读取官方总结和完整转写。',
      },
      resourceId: {
        type: 'integer',
        minimum: 1,
        description: 'qmblog 内部素材资源 ID。用于继续读取或复用已保存素材。',
      },
      maxChars: {
        type: 'integer',
        minimum: 1000,
        maximum: 30000,
        description: '最多返回的文字稿字符数，默认 16000，最多 30000。',
      },
      maxWaitSeconds: {
        type: 'integer',
        minimum: 0,
        maximum: 90,
        description:
          '等待转写任务完成的秒数，默认 60，最多 90。新音视频可能返回 processing。',
      },
    },
  },
  {
    validate(value) {
      const normalized = normalizeFetchTranscriptInput(value)
      return normalized
        ? { success: true, value: normalized }
        : { success: false, error: new Error('URL、taskId、noteId 不能都为空') }
    },
  },
)

const readArticleContentInputSchema = jsonSchema<ReadArticleContentInput>(
  {
    type: 'object',
    additionalProperties: false,
    properties: {
      scope: {
        type: 'string',
        enum: ARTICLE_READ_SCOPES,
        description:
          '读取范围。all 读取当前正文，selection 只读取当前选中文本。',
      },
      maxChars: {
        type: 'integer',
        minimum: 1000,
        maximum: 30000,
        description: '最多返回字符数，默认 16000，最多 30000。',
      },
    },
  },
  {
    validate(value) {
      return { success: true, value: normalizeReadArticleContentInput(value) }
    },
  },
)

const setArticleTitleInputSchema = jsonSchema<SetArticleTitleInput>(
  {
    type: 'object',
    additionalProperties: false,
    required: ['title'],
    properties: {
      title: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
        description:
          '要设置为当前文章标题的完整文本，不要带序号、引号或 Markdown 标记。',
      },
    },
  },
  {
    validate(value) {
      const normalized = normalizeSetArticleTitleInput(value)
      return normalized
        ? { success: true, value: normalized }
        : { success: false, error: new Error('标题不能为空') }
    },
  },
)

const setArticleDescriptionInputSchema = jsonSchema<SetArticleDescriptionInput>(
  {
    type: 'object',
    additionalProperties: false,
    required: ['description'],
    properties: {
      description: {
        type: 'string',
        minLength: 1,
        maxLength: 500,
        description: '要设置为文章摘要的纯文本，避免 Markdown。',
      },
    },
  },
  {
    validate(value) {
      const normalized = normalizeSetArticleDescriptionInput(value)
      return normalized
        ? { success: true, value: normalized }
        : { success: false, error: new Error('摘要不能为空') }
    },
  },
)

const setArticleTagsInputSchema = jsonSchema<SetArticleTagsInput>(
  {
    type: 'object',
    additionalProperties: false,
    required: ['tags'],
    properties: {
      tags: {
        type: 'array',
        minItems: 1,
        maxItems: 10,
        items: { type: 'string', minLength: 1, maxLength: 40 },
        description: '要设置为文章标签的短词数组。',
      },
    },
  },
  {
    validate(value) {
      const normalized = normalizeSetArticleTagsInput(value)
      return normalized
        ? { success: true, value: normalized }
        : { success: false, error: new Error('标签不能为空') }
    },
  },
)

const insertMarkdownInputSchema = jsonSchema<InsertMarkdownInput>(
  {
    type: 'object',
    additionalProperties: false,
    required: ['markdown'],
    properties: {
      markdown: {
        type: 'string',
        minLength: 1,
        maxLength: 12000,
        description: '要插入文章正文的 Markdown 内容。',
      },
      target: {
        type: 'object',
        additionalProperties: false,
        properties: {
          mode: {
            type: 'string',
            enum: INSERT_TARGET_MODES,
            description:
              '插入位置：cursor 插入当前光标处，section 插入指定章节标题后。',
          },
          sectionNumber: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            description: '章节序号，从正文第一个二级/三级标题开始计数。',
          },
          sectionTitle: {
            type: 'string',
            maxLength: 120,
            description: '章节标题关键词。',
          },
        },
      },
    },
  },
  {
    validate(value) {
      const normalized = normalizeInsertMarkdownInput(value)
      return normalized
        ? { success: true, value: normalized }
        : { success: false, error: new Error('插入内容不能为空') }
    },
  },
)

const editArticleContentInputSchema = jsonSchema<EditArticleContentInput>(
  {
    type: 'object',
    additionalProperties: false,
    required: ['action', 'target'],
    properties: {
      action: {
        type: 'string',
        enum: ARTICLE_EDIT_ACTIONS,
        description: '编辑动作。replace 替换目标内容，delete 删除目标内容。',
      },
      target: {
        type: 'object',
        additionalProperties: false,
        required: ['mode'],
        properties: {
          mode: {
            type: 'string',
            enum: ARTICLE_EDIT_TARGET_MODES,
            description:
              '目标范围：selection 为当前选区，exactText 为正文中的精确文本，all 为整篇正文。',
          },
          exactText: {
            type: 'string',
            maxLength: 12000,
            description:
              'mode=exactText 时必填，必须从当前文章读取结果中复制要替换或删除的原文片段。',
          },
          occurrence: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            description: '当 exactText 在正文中出现多次时，指定第几处匹配。',
          },
          useLastMatch: {
            type: 'boolean',
            description:
              '当 exactText 在正文中出现多次且要处理最后一处时设为 true。',
          },
        },
      },
      replacementMarkdown: {
        type: 'string',
        maxLength: 12000,
        description:
          'action=replace 时必填，替换后的 Markdown 内容。删除时不要传。',
      },
      expectedText: {
        type: 'string',
        maxLength: 12000,
        description:
          '可选安全校验。执行前确认目标范围仍包含这段原文，防止误改已变化内容。',
      },
    },
  },
  {
    validate(value) {
      const normalized = normalizeEditArticleContentInput(value)
      return normalized
        ? { success: true, value: normalized }
        : { success: false, error: new Error('正文编辑参数不完整') }
    },
  },
)

function createEditorChatTools({
  db,
  imageEnv,
  webResearchEnv,
  transcriptResearchEnv,
  images,
  context,
  sessionId,
  imageProfileId,
  writeStatus,
  writeImageResult,
}: EditorChatToolFactoryInput) {
  return {
    readArticleContent: tool<ReadArticleContentInput, ReadArticleContentOutput>(
      {
        title: '读取当前文章正文',
        description: [
          '当用户要求基于当前文章进行删除、替换、调整、去重、定位问题、检查正文或你需要确认最新正文时调用。',
          '如果要删除或替换正文中的旧内容，优先先调用本工具读取最新正文，再调用 editArticleContent。',
        ].join('\n'),
        inputSchema: readArticleContentInputSchema,
        outputSchema: jsonSchema<ReadArticleContentOutput>({
          type: 'object',
          additionalProperties: false,
          required: [
            'status',
            'message',
            'scope',
            'content',
            'charCount',
            'truncated',
            'title',
            'sectionToc',
            'currentSection',
            'selectedText',
          ],
          properties: {
            status: { type: 'string', enum: ['success', 'error'] },
            message: { type: 'string' },
            scope: { type: 'string', enum: ARTICLE_READ_SCOPES },
            content: { type: 'string' },
            charCount: { type: 'integer' },
            truncated: { type: 'boolean' },
            title: { type: 'string' },
            sectionToc: { type: 'string' },
            currentSection: { type: 'string' },
            selectedText: { type: 'string' },
          },
        }),
      },
    ),
    setArticleTitle: tool<SetArticleTitleInput, EditorToolOutput>({
      title: '设置文章标题',
      description:
        '当用户明确要求采用某个标题、选择第几个标题或替换当前文章标题时调用。不要只回复“可以”。',
      inputSchema: setArticleTitleInputSchema,
      outputSchema: jsonSchema<EditorToolOutput>({
        type: 'object',
        additionalProperties: false,
        required: ['status', 'message'],
        properties: {
          status: { type: 'string', enum: ['success', 'error'] },
          message: { type: 'string' },
        },
      }),
    }),
    setArticleDescription: tool<SetArticleDescriptionInput, EditorToolOutput>({
      title: '设置文章摘要',
      description: '当用户明确要求把某段内容设为摘要或更新当前文章摘要时调用。',
      inputSchema: setArticleDescriptionInputSchema,
      outputSchema: jsonSchema<EditorToolOutput>({
        type: 'object',
        additionalProperties: false,
        required: ['status', 'message'],
        properties: {
          status: { type: 'string', enum: ['success', 'error'] },
          message: { type: 'string' },
        },
      }),
    }),
    setArticleTags: tool<SetArticleTagsInput, EditorToolOutput>({
      title: '设置文章标签',
      description: '当用户明确要求采用、替换或更新文章标签时调用。',
      inputSchema: setArticleTagsInputSchema,
      outputSchema: jsonSchema<EditorToolOutput>({
        type: 'object',
        additionalProperties: false,
        required: ['status', 'message'],
        properties: {
          status: { type: 'string', enum: ['success', 'error'] },
          message: { type: 'string' },
        },
      }),
    }),
    insertMarkdownIntoArticle: tool<InsertMarkdownInput, EditorToolOutput>({
      title: '插入 Markdown 到正文',
      description: [
        '只在用户明确要求把新内容插入、写入、放到、添加到、追加到文章正文时调用。',
        '如果用户要求替换、删除、去掉、移除、改写已有正文或清理重复内容，必须调用 editArticleContent，不要用插入冒充替换。',
        '如果用户只是要求生成一首诗、写一段文字、给出候选内容、继续创作或润色文本，必须只在对话中回复，不要调用此工具。',
        '如果用户说“插到第二节后面/某一节下面”，target.mode 必须为 section 并填写 sectionNumber 或 sectionTitle。',
      ].join('\n'),
      inputSchema: insertMarkdownInputSchema,
      outputSchema: jsonSchema<EditorToolOutput>({
        type: 'object',
        additionalProperties: false,
        required: ['status', 'message'],
        properties: {
          status: { type: 'string', enum: ['success', 'error'] },
          message: { type: 'string' },
        },
      }),
    }),
    editArticleContent: tool<EditArticleContentInput, EditorToolOutput>({
      title: '替换或删除文章正文',
      description: [
        '当用户明确要求替换、删除、去掉、移除、清理重复、改写已有正文或替换整篇正文时调用。',
        '删除正文时 target.mode 只能用 selection 或 exactText，不能删除 all。',
        '替换整篇正文只有在用户明确要求整体替换、全文重写或采用完整新版本时才使用 target.mode=all。',
        '如果目标内容不确定，先调用 readArticleContent 读取最新正文，再复制原文片段到 target.exactText。',
        '如果 exactText 可能出现多次，必须指定 occurrence 或 useLastMatch，避免误删误改。',
      ].join('\n'),
      inputSchema: editArticleContentInputSchema,
      outputSchema: jsonSchema<EditorToolOutput>({
        type: 'object',
        additionalProperties: false,
        required: ['status', 'message'],
        properties: {
          status: { type: 'string', enum: ['success', 'error'] },
          message: { type: 'string' },
        },
      }),
    }),
    generateArticleImage: tool<
      GenerateArticleImageInput,
      GenerateArticleImageOutput
    >({
      title: '生成文章图片',
      description: [
        '当用户要求生图、生成图片、配图、封面图、插图、海报、信息图或可插入文章的视觉内容时调用。',
        '不要只返回图片提示词；如果用户明确要图片，直接调用此工具生成并返回可插入文章的图片。',
        '只有用户说“给第二节配图/给某章节生成插图/插到某章节/设为封面”等带有文章位置或用途的请求，才设置 insertTarget；否则只生成图片并在对话中展示。',
        '生成章节/小节配图时，prompt 只描述该小节主题和视觉隐喻；不要包含文章标题，除非用户明确要求图片里出现标题文字。',
        '普通配图不要把 H1/H2/H3、章节序号、文章标题或目录文本当成画面里的可读文字。',
      ].join('\n'),
      inputSchema: generateArticleImageInputSchema,
      execute: async (input, options) => {
        const normalized = normalizeImageToolInput(input)
        if (!normalized) {
          const output: GenerateArticleImageOutput = {
            status: 'error',
            error: '图片生成参数不完整',
            prompt: '',
            aspectRatio: 'auto',
            resolution: 'auto',
            placement: 'inline',
            insertTarget: undefined,
          }
          writeImageResult?.(options.toolCallId, output)
          await recordAiChatToolAction(db, {
            toolCallId: options.toolCallId,
            sessionId,
            postId: context.postId,
            slug: context.slug,
            actionType: 'generate_image',
            status: 'error',
            errorMessage: '图片生成参数不完整',
          })
          return output
        }

        if (!images) {
          const output: GenerateArticleImageOutput = {
            status: 'error',
            error: '图片存储未配置，暂时不能在对话里生成可插入文章的图片。',
            prompt: normalized.prompt,
            aspectRatio: normalized.aspectRatio || 'auto',
            resolution: normalized.resolution || 'auto',
            placement: normalized.placement || 'inline',
            insertTarget: normalized.insertTarget,
          }
          writeImageResult?.(options.toolCallId, output)
          await recordAiChatToolAction(db, {
            toolCallId: options.toolCallId,
            sessionId,
            postId: context.postId,
            slug: context.slug,
            actionType: 'generate_image',
            status: 'error',
            errorMessage: '图片存储未配置',
          })
          return output
        }

        try {
          writeStatus?.({ label: '正在生成图片', stage: 'image' })
          const imageGenerationContext = buildImageGenerationContext(
            normalized,
            context,
          )
          const result = await generateEditorImage({
            action: 'custom',
            actionLabel:
              normalized.placement === 'cover'
                ? 'AI 对话封面图'
                : 'AI 对话配图',
            userPrompt: normalized.prompt,
            articleTitle: imageGenerationContext.articleTitle,
            contextText: imageGenerationContext.contextText,
            aspectRatio: normalized.aspectRatio,
            resolution: normalized.resolution,
            profileId: imageProfileId,
            source: 'ai_chat',
            strictUserPrompt: false,
            db,
            env: imageEnv,
            images,
          })
          const output: GenerateArticleImageOutput = {
            status: 'success',
            url: result.url,
            variants: result.variants,
            alt: normalized.alt || result.alt,
            prompt: result.prompt,
            revisedPrompt: result.revisedPrompt,
            aspectRatio: result.aspectRatio,
            resolution: result.resolution,
            actionLabel: result.actionLabel,
            placement: normalized.placement || 'inline',
            insertTarget: normalized.insertTarget,
            model: result.model,
            profileName: result.profileName,
            assetId: result.assetId,
          }
          writeImageResult?.(options.toolCallId, output)

          const sideEffects: Array<Promise<unknown>> = [
            recordAiChatToolAction(db, {
              toolCallId: options.toolCallId,
              sessionId,
              postId: context.postId,
              slug: context.slug,
              actionType: normalized.insertTarget
                ? 'insert_image'
                : 'generate_image',
              assetId: result.assetId,
              status: 'success',
            }),
          ]
          if (result.assetId) {
            sideEffects.unshift(
              linkMediaAssetToArticle(db, {
                assetId: result.assetId,
                postId: context.postId,
                slug: context.slug,
                role:
                  normalized.placement === 'cover'
                    ? 'cover'
                    : normalized.insertTarget?.mode === 'section' ||
                        normalized.placement === 'section'
                      ? 'section'
                      : 'inline',
                sectionTitle: normalized.insertTarget?.sectionTitle,
                sectionNumber: normalized.insertTarget?.sectionNumber,
                toolCallId: options.toolCallId,
                sessionId,
              }),
            )
          }
          await Promise.allSettled(sideEffects)

          writeStatus?.({ label: '图片已生成', stage: 'done' })
          return output
        } catch (error) {
          const message = sanitizeAiErrorMessage(error, '图片生成失败')
          const output: GenerateArticleImageOutput = {
            status: 'error',
            error: message,
            prompt: normalized.prompt,
            aspectRatio: normalized.aspectRatio || 'auto',
            resolution: normalized.resolution || 'auto',
            placement: normalized.placement || 'inline',
            insertTarget: normalized.insertTarget,
          }
          writeImageResult?.(options.toolCallId, output)
          await recordAiChatToolAction(db, {
            toolCallId: options.toolCallId,
            sessionId,
            postId: context.postId,
            slug: context.slug,
            actionType: 'generate_image',
            status: 'error',
            errorMessage: message,
          })
          return output
        }
      },
    }),
    searchWeb: tool<SearchWebInput, WebSearchOutput>({
      title: '搜索网页',
      description: [
        '当用户要求搜索、查资料、找来源、了解最新信息或寻找写作素材时调用。',
        '搜索结果只作为线索；如果要使用某篇网页的具体内容，应继续调用 fetchPageMarkdown 读取页面。',
        '回答中使用搜索结果时必须附上来源链接，不要编造搜索结果之外的事实。',
      ].join('\n'),
      inputSchema: searchWebInputSchema,
      outputSchema: jsonSchema<WebSearchOutput>({
        type: 'object',
        additionalProperties: false,
        required: ['status', 'query', 'results'],
        properties: {
          status: { type: 'string', enum: ['success', 'error'] },
          query: { type: 'string' },
          results: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['title', 'url', 'snippet'],
              properties: {
                title: { type: 'string' },
                url: { type: 'string' },
                snippet: { type: 'string' },
                source: { type: 'string' },
              },
            },
          },
          error: { type: 'string' },
        },
      }),
      execute: async (input) => {
        const normalized = normalizeSearchWebInput(input)
        if (!normalized) {
          return {
            status: 'error',
            query: '',
            results: [],
            error: '搜索关键词不能为空',
          }
        }
        return searchWeb({
          query: normalized.query,
          limit: normalized.limit,
          env: webResearchEnv,
        })
      },
    }),
    fetchPageMarkdown: tool<FetchPageMarkdownInput, FetchPageMarkdownOutput>({
      title: '读取网页为 Markdown',
      description: [
        '当用户提供 URL 并要求阅读、总结、提取素材、转 Markdown 或基于链接写作时调用。',
        '如果用户只给出搜索主题，先调用 searchWeb；如果用户指定某个搜索结果或 URL，再调用本工具。',
        '抓取结果是外部来源素材，回答或写入文章时必须保留来源链接，并避免照搬长段原文。',
      ].join('\n'),
      inputSchema: fetchPageMarkdownInputSchema,
      outputSchema: jsonSchema<FetchPageMarkdownOutput>({
        type: 'object',
        additionalProperties: false,
        required: ['status', 'url'],
        properties: {
          status: { type: 'string', enum: ['success', 'error'] },
          url: { type: 'string' },
          finalUrl: { type: 'string' },
          title: { type: 'string' },
          markdown: { type: 'string' },
          excerpt: { type: 'string' },
          source: {
            type: 'string',
            enum: ['jina', 'defuddle', 'curlmd', 'fxtwitter', 'vxtwitter'],
          },
          truncated: { type: 'boolean' },
          error: { type: 'string' },
        },
      }),
      execute: async (input) => {
        const normalized = normalizeFetchPageMarkdownInput(input)
        if (!normalized) {
          return { status: 'error', url: '', error: 'URL 不能为空' }
        }
        return fetchPageMarkdown({
          url: normalized.url,
          maxChars: normalized.maxChars,
          env: webResearchEnv,
        })
      },
    }),
    fetchTranscript: tool<FetchTranscriptInput, FetchTranscriptOutput>({
      title: '获取音视频文字稿',
      description: [
        '当用户提供小宇宙、YouTube、B站等音视频 URL，并要求获取文字稿、转写、总结视频/播客、提炼节目内容或作为写作素材时调用。',
        '如果返回 processing，说明 Get笔记仍在处理转写任务；明确告知用户任务已提交和可稍后继续获取，不要把它说成工具不可用。',
        '对小宇宙、YouTube、B站等音视频 URL，如果 fetchTranscript 返回 processing 或 error，不要改用 fetchPageMarkdown 抓同一个 URL 来冒充官方总结或文字稿。',
        '后续用户说“继续获取刚才那个”时，用上一轮返回的 taskId、noteId 或 resourceId 再调用 fetchTranscript。',
        '返回 success 时优先使用 summary 快速回答；用户要求深度处理、逐段分析或基于原始文稿写作时，再使用 transcript。',
        '使用文字稿写作或总结时必须保留来源链接；不要大段照搬原始 transcript，优先提炼成素材。',
      ].join('\n'),
      inputSchema: fetchTranscriptInputSchema,
      outputSchema: jsonSchema<FetchTranscriptOutput>({
        type: 'object',
        additionalProperties: false,
        required: ['status', 'url'],
        properties: {
          status: { type: 'string', enum: ['success', 'processing', 'error'] },
          resourceId: { type: 'integer' },
          url: { type: 'string' },
          finalUrl: { type: 'string' },
          noteId: { type: 'string' },
          taskId: { type: 'string' },
          title: { type: 'string' },
          originalTitle: { type: 'string' },
          platform: { type: 'string' },
          summary: { type: 'string' },
          transcript: { type: 'string' },
          excerpt: { type: 'string' },
          source: { type: 'string', enum: ['getnote-web', 'getnote-openapi'] },
          truncated: { type: 'boolean' },
          message: { type: 'string' },
          error: { type: 'string' },
        },
      }),
      execute: async (input) => {
        const normalized = normalizeFetchTranscriptInput(input)
        if (!normalized) {
          return {
            status: 'error',
            url: '',
            error: 'URL、taskId、noteId 不能都为空',
          }
        }
        writeStatus?.({ label: '正在提交音视频转写任务', stage: 'thinking' })
        const result = await fetchTranscript({
          url: normalized.url,
          taskId: normalized.taskId,
          noteId: normalized.noteId,
          resourceId: normalized.resourceId,
          maxChars: normalized.maxChars,
          maxWaitSeconds: normalized.maxWaitSeconds,
          env: transcriptResearchEnv,
          db,
          context: {
            sessionId,
            postId: context.postId,
            slug: context.slug,
          },
        })
        writeStatus?.({
          label:
            result.status === 'success'
              ? '文字稿已获取'
              : result.status === 'processing'
                ? '转写任务已提交'
                : '文字稿获取失败',
          stage: result.status === 'success' ? 'done' : 'thinking',
        })
        return result
      },
    }),
  }
}

function writeTransientStatus(
  writer: UIMessageStreamWriter<EditorChatUIMessage>,
  status: EditorChatStatusData,
) {
  writer.write({
    type: 'data-status',
    data: status,
    transient: true,
  })
}

function writeImageResult(
  writer: UIMessageStreamWriter<EditorChatUIMessage>,
  toolCallId: string,
  output: GenerateArticleImageOutput,
) {
  writer.write({
    type: 'data-imageResult',
    data: { toolCallId, output },
  })
}

function getImageRuntimeEnv(
  env: Partial<CloudflareEnv>,
): Record<string, string | undefined> {
  return {
    AI_CONFIG_ENCRYPTION_SECRET: (env as Record<string, unknown>)
      .AI_CONFIG_ENCRYPTION_SECRET as string | undefined,
    ADMIN_TOKEN_SALT: (env as Record<string, unknown>).ADMIN_TOKEN_SALT as
      | string
      | undefined,
    ENABLE_CF_IMAGE_PIPELINE: (env as Record<string, unknown>)
      .ENABLE_CF_IMAGE_PIPELINE as string | undefined,
  }
}

function getWebResearchRuntimeEnv(
  env: Partial<CloudflareEnv>,
): Record<string, string | undefined> {
  return {
    ENABLE_AI_WEB_RESEARCH: (env as Record<string, unknown>)
      .ENABLE_AI_WEB_RESEARCH as string | undefined,
    PIPELLM_API_KEY: (env as Record<string, unknown>).PIPELLM_API_KEY as
      | string
      | undefined,
  }
}

function getTranscriptResearchRuntimeEnv(
  env: Partial<CloudflareEnv>,
): Record<string, string | undefined> {
  const record = env as Record<string, unknown>
  return {
    ENABLE_AI_TRANSCRIPT_RESEARCH: record.ENABLE_AI_TRANSCRIPT_RESEARCH as
      | string
      | undefined,
    ENABLE_AI_WEB_RESEARCH: record.ENABLE_AI_WEB_RESEARCH as string | undefined,
    GETNOTE_API_KEY: record.GETNOTE_API_KEY as string | undefined,
    GETNOTE_CLIENT_ID: record.GETNOTE_CLIENT_ID as string | undefined,
    GETNOTE_WEB_TOKEN: record.GETNOTE_WEB_TOKEN as string | undefined,
    GETNOTE_WEB_TOKEN_EXPIRES_AT: record.GETNOTE_WEB_TOKEN_EXPIRES_AT as
      | string
      | undefined,
    GETNOTE_WEB_REFRESH_TOKEN: record.GETNOTE_WEB_REFRESH_TOKEN as
      | string
      | undefined,
    GETNOTE_WEB_REFRESH_TOKEN_EXPIRES_AT:
      record.GETNOTE_WEB_REFRESH_TOKEN_EXPIRES_AT as string | undefined,
    AI_CONFIG_ENCRYPTION_SECRET: record.AI_CONFIG_ENCRYPTION_SECRET as
      | string
      | undefined,
    ADMIN_TOKEN_SALT: record.ADMIN_TOKEN_SALT as string | undefined,
  }
}

function buildEditorChatSystemPrompt(context: Required<EditorChatContext>) {
  const metadataLines = [
    context.title ? `标题：${context.title}` : '',
    context.category ? `分类：${context.category}` : '',
    context.tags.length > 0 ? `标签：${context.tags.join('、')}` : '',
    context.slug ? `Slug：${context.slug}` : '',
    context.description ? `摘要：${context.description}` : '',
  ].filter(Boolean)

  return [
    '你是 qmblog 后台编辑器里的 AI 写作助手。',
    '你的任务是帮作者围绕当前文章进行写作、编辑、结构优化、标题摘要生成和事实自查。',
    '回答必须直接、可执行，优先给作者可以立即粘贴或采用的内容。',
    '默认原则：只在对话中产出内容，不要自动修改文章。',
    '如果用户只是要求生成候选标题、摘要、标签、段落、诗歌、文案或其他内容，直接输出候选内容，不要自动改文章。',
    '只有用户明确要求“采用/选择/替换/设置/插入/应用/写入/改成/放到/添加到/追加到”时，才调用对应编辑工具。',
    '如果用户要求读取、检查、定位或基于当前正文判断问题，调用 readArticleContent 读取最新编辑器内容。',
    '如果用户要求删除、去掉、移除、清理重复、替换、改写已有正文或替换整篇正文，调用 editArticleContent；不要用 insertMarkdownIntoArticle 插入新版后让用户手动删除旧内容。',
    '执行正文删除或替换前，如果你不能确定目标旧文本在当前编辑器里的精确内容，先调用 readArticleContent，再把读取到的原文片段作为 exactText 或 expectedText。',
    '当同一 exactText 在正文里出现多次时，必须用 occurrence 或 useLastMatch 指定处理哪一处；不确定就先说明需要用户选中目标段落。',
    '用户说“选第一个标题/用第二个标题”时，从最近对话中的候选标题里找出对应完整标题，并调用 setArticleTitle。',
    '设置标题用 setArticleTitle；设置摘要用 setArticleDescription；设置标签用 setArticleTags；插入新正文文本用 insertMarkdownIntoArticle；替换或删除已有正文用 editArticleContent。',
    '如果用户要求把文本插入到某一节，例如“插到第二节”“放到某小节后”，insertMarkdownIntoArticle 的 target 必须使用 mode=section，并传 sectionNumber 或 sectionTitle。',
    '如果用户提到“当前节/这一节/本节/当前浏览位置”，优先按当前浏览小节解析 target；当前浏览小节为空时再按文章章节索引或追问。',
    '如果用户要求生成图片、封面、插图、配图、海报或信息图，必须优先调用 generateArticleImage 工具，不要只写图片提示词。',
    '如果用户要求多张文章配图、为多节内容分别配图、或一次生成一组插图，应为每张图分别调用一次 generateArticleImage；能在同一轮并行发起多个工具调用时，不要等上一张完成后再发起下一张。',
    '多张配图必须让每个 prompt 针对对应小节/用途有所区分，避免多次使用同一个笼统提示词。',
    '普通文章配图默认不要出现可读文字；不要把 H1/H2/H3、章节序号、文章标题或目录文本画进图片，除非用户明确要求文字海报、标题图或信息图。',
    '图片例外：用户说“给第二节配图/给某章节生成插图/设为封面”这类按文章位置或用途生图的请求，隐含插入意图；调用 generateArticleImage 时设置 placement 和 insertTarget。',
    '如果用户只要求生成图片但没有文章位置或用途，只调用 generateArticleImage，不设置 insertTarget，不要自动插入文章。',
    '图片工具返回成功后，用一句话说明图片已生成或已插入；不要重复输出完整图片 URL。',
    '如果图片工具返回错误，简短说明失败原因，并给出一个可直接重试的精炼图片提示词。',
    '如果用户要求搜索、查资料、找来源、最新信息、竞品资料或写作素材，可以调用 searchWeb。',
    '如果用户提供 URL 并要求阅读、总结、提炼、转 Markdown 或作为写作素材，可以调用 fetchPageMarkdown。',
    '如果用户提供小宇宙、YouTube、B站等音视频 URL，并要求获取文字稿、转写、总结或作为写作素材，优先调用 fetchTranscript。',
    '如果 fetchTranscript 返回 processing，下一轮用户要求“继续获取刚才的内容/处理转写文字/总结刚才的视频”时，使用上一轮返回的 taskId、noteId 或 resourceId 再调用 fetchTranscript。',
    '如果 fetchTranscript 返回 summary 和 transcript，快速回答优先用 summary；需要原始细节时再使用 transcript。',
    '搜索结果只作为线索；需要使用具体网页内容时，优先读取页面后再总结或写作。',
    '引用外部信息时必须附来源链接；不要编造工具结果中没有的事实、数字、引用或链接。',
    '不要大段照搬外部网页原文，优先提炼成自己的写作素材。',
    '如果文章上下文不足，请明确指出缺口，并给出最小可继续推进的问题。',
    '不要编造事实、引用、链接或文章中没有的具体信息。',
    '',
    metadataLines.length > 0
      ? `当前文章属性：\n${metadataLines.join('\n')}`
      : '当前文章属性：未填写',
    context.selectedText ? `\n当前选中文本：\n${context.selectedText}` : '',
    context.sectionToc
      ? `\n当前文章章节索引（用于理解“第几节/某章节”）：\n${context.sectionToc}`
      : '',
    context.currentSection
      ? `\n当前浏览小节（用于理解“当前节/这一节/本节”）：\n${context.currentSection}`
      : '',
    context.documentText ? `\n当前文章正文：\n${context.documentText}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function sanitizeIncomingMessages(messages: unknown[]): unknown[] {
  return messages.filter((message) => {
    if (!message || typeof message !== 'object') return true
    const parts = (message as { parts?: unknown }).parts
    return !Array.isArray(parts) || parts.length > 0
  })
}

function getMessageText(message: unknown) {
  if (!message || typeof message !== 'object') return ''
  const parts = (message as { parts?: unknown }).parts
  if (!Array.isArray(parts)) return ''

  return parts
    .map((part) => {
      if (!part || typeof part !== 'object') return ''
      const text = (part as { text?: unknown }).text
      return typeof text === 'string' ? text : ''
    })
    .join('\n')
    .trim()
}

function getLastUserMessageText(messages: unknown[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (!message || typeof message !== 'object') continue
    if ((message as { role?: unknown }).role !== 'user') continue
    const text = getMessageText(message)
    if (text) return text
  }
  return ''
}

function getMessagesAfterLastUser(messages: unknown[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (!message || typeof message !== 'object') continue
    if ((message as { role?: unknown }).role !== 'user') continue
    return messages.slice(index + 1)
  }
  return []
}

function getToolPartStatus(part: unknown, toolName: keyof EditorChatTools) {
  if (!part || typeof part !== 'object') return ''
  const record = part as Record<string, unknown>
  if (record.type !== `tool-${toolName}`) return ''
  if (record.state === 'output-error') return 'error'
  if (record.state !== 'output-available') return ''
  const output = record.output
  if (!output || typeof output !== 'object') return ''
  const status = (output as Record<string, unknown>).status
  return typeof status === 'string' ? status : 'success'
}

function latestTurnHasToolOutput(
  messages: unknown[],
  toolName: keyof EditorChatTools,
) {
  return getMessagesAfterLastUser(messages).some((message) => {
    if (!message || typeof message !== 'object') return false
    const parts = (message as { parts?: unknown }).parts
    if (!Array.isArray(parts)) return false
    return parts.some((part) => Boolean(getToolPartStatus(part, toolName)))
  })
}

function latestTurnHasSuccessfulToolOutput(
  messages: unknown[],
  toolNames: Array<keyof EditorChatTools>,
) {
  return getMessagesAfterLastUser(messages).some((message) => {
    if (!message || typeof message !== 'object') return false
    const parts = (message as { parts?: unknown }).parts
    if (!Array.isArray(parts)) return false
    return parts.some((part) =>
      toolNames.some(
        (toolName) => getToolPartStatus(part, toolName) === 'success',
      ),
    )
  })
}

function stepsHaveSuccessfulToolOutput(
  steps: Array<{
    toolResults?: Array<{ toolName?: string; output?: unknown }>
  }>,
  toolNames: Array<keyof EditorChatTools>,
) {
  return steps.some((step) =>
    step.toolResults?.some((result) => {
      if (!toolNames.includes(result.toolName as keyof EditorChatTools))
        return false
      const output = result.output
      if (!output || typeof output !== 'object') return false
      return (output as Record<string, unknown>).status === 'success'
    }),
  )
}

function hasUrlFetchIntent(text: string) {
  const normalized = text.trim()
  if (!/https?:\/\/[^\s<>"'）)]+/i.test(normalized)) return false
  return /抓取|读取|读一下|看一下|打开|访问|获取|提取|总结|摘要|转\s*markdown|markdown|作为素材|链接内容|网页内容|fetch|read|extract|summari[sz]e/i.test(
    normalized,
  )
}

function extractFirstUrl(text: string) {
  return text.match(/https?:\/\/[^\s<>"'）)]+/i)?.[0] || ''
}

function hasTranscriptFetchIntent(text: string) {
  const url = extractFirstUrl(text)
  if (!url || !isSupportedTranscriptUrl(url)) return false
  return /抓取|读取|读一下|看一下|打开|访问|获取|提取|总结|摘要|转写|文字稿|字幕|播客|视频|音频|节目|作为素材|链接内容|fetch|read|extract|transcript|caption|subtitle|summari[sz]e/i.test(
    text,
  )
}

function hasArticleInsertIntent(text: string) {
  const normalized = text.trim()
  if (!normalized) return false
  return /(?:插入|插到|写入|写到|放入|放到|添加到|追加到|加入|生成到|输出到).{0,16}(?:正文|文章|当前文章|编辑器)|(?:正文|文章|当前文章|编辑器).{0,16}(?:插入|写入|放入|放到|添加|追加|加入)|(?:insert|write|add|append).{0,32}(?:article|post|editor|body)/i.test(
    normalized,
  )
}

function parsePositiveInteger(value: unknown) {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function isOpenRouterRuntimeConfig(
  config: OpenAiCompatibleRuntimeConfig,
): boolean {
  const provider = config.provider?.trim().toLowerCase()
  if (provider === 'openrouter') return true

  const providerName = config.providerName?.trim().toLowerCase()
  if (providerName?.includes('openrouter')) return true

  const baseURL = config.baseURL?.trim()
  if (!baseURL) return false

  try {
    const hostname = new URL(baseURL).hostname.toLowerCase()
    return hostname === 'openrouter.ai' || hostname.endsWith('.openrouter.ai')
  } catch {
    return /(^|\.)openrouter\.ai(\/|$)/i.test(baseURL)
  }
}

export async function POST(req: NextRequest) {
  const route = await getRouteEnvWithDb()
  if (!route.ok) return route.response

  const unauthorized = await ensureAuthenticatedRequest(req, route.db)
  if (unauthorized) return unauthorized

  let body: EditorChatRequestBody
  try {
    body = await parseJsonBody<EditorChatRequestBody>(req)
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : '请求体不是有效 JSON',
      400,
    )
  }

  if (!Array.isArray(body.messages)) {
    return jsonError('缺少 messages 参数', 400)
  }

  try {
    const aiEnv = getAiRuntimeEnv(route.env)
    const config = await resolveConfig(
      aiEnv,
      route.db,
      parsePositiveInteger(body.profileId),
    )

    if (config.strategy === 'disabled') {
      return jsonError(config.reason, 400)
    }

    if (config.strategy !== 'external-provider') {
      return jsonError(
        'AI 对话面板需要在后台 LLM配置中启用 OpenAI 兼容文本模型。',
        400,
      )
    }

    const usesAnthropicCompatibleProvider = isAnthropicCompatibleConfig({
      provider: config.provider,
      providerName: config.providerName,
      providerType: config.providerType,
    })

    const provider = createOpenAICompatible({
      name: 'qmblog-editor',
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      includeUsage: !isOpenRouterRuntimeConfig(config),
    })

    const context = normalizeContext(body.context)
    const messages = sanitizeIncomingMessages(
      body.messages,
    ) as EditorChatUIMessage[]
    const lastUserMessageText = getLastUserMessageText(messages)
    const hasTranscriptSourceIntent =
      hasTranscriptFetchIntent(lastUserMessageText)
    const hasPageSourceIntent =
      !hasTranscriptSourceIntent && hasUrlFetchIntent(lastUserMessageText)
    const latestTurnHasTranscriptFetch = latestTurnHasToolOutput(
      messages,
      'fetchTranscript',
    )
    const latestTurnHasPageFetch = latestTurnHasToolOutput(
      messages,
      'fetchPageMarkdown',
    )
    const latestTurnHasSourceFetch =
      latestTurnHasTranscriptFetch || latestTurnHasPageFetch
    const latestTurnHasInsertAttempt = latestTurnHasToolOutput(
      messages,
      'insertMarkdownIntoArticle',
    )
    const latestTurnHasSuccessfulSourceFetch =
      latestTurnHasSuccessfulToolOutput(messages, [
        'fetchTranscript',
        'fetchPageMarkdown',
      ])
    const forceFetchTranscript =
      hasTranscriptSourceIntent && !latestTurnHasTranscriptFetch
    const forceFetchPageMarkdown =
      !forceFetchTranscript && hasPageSourceIntent && !latestTurnHasPageFetch
    const forceInsertMarkdown =
      hasArticleInsertIntent(lastUserMessageText) && !latestTurnHasInsertAttempt
    const images = route.env.IMAGES as ImageBucket | undefined

    const stream = createUIMessageStream<EditorChatUIMessage>({
      originalMessages: messages,
      onError: (error) =>
        sanitizeAiErrorMessage(error, 'AI 对话失败，请稍后重试。'),
      execute: async ({ writer }) => {
        writer.write({ type: 'start', messageId: generateId() })
        writeTransientStatus(writer, {
          label: '正在准备上下文',
          stage: 'preparing',
        })

        const writeStatus = (status: EditorChatStatusData) =>
          writeTransientStatus(writer, status)
        const tools = createEditorChatTools({
          db: route.db,
          imageEnv: getImageRuntimeEnv(route.env),
          webResearchEnv: getWebResearchRuntimeEnv(route.env),
          transcriptResearchEnv: getTranscriptResearchRuntimeEnv(route.env),
          images,
          context,
          sessionId: body.sessionId,
          imageProfileId: parsePositiveInteger(body.imageProfileId),
          writeStatus,
          writeImageResult: (toolCallId, output) =>
            writeImageResult(writer, toolCallId, output),
        })
        const validatedMessages = await validateUIMessages<EditorChatUIMessage>(
          {
            messages,
            tools,
          },
        )
        const modelMessages = await convertToModelMessages(validatedMessages, {
          tools,
          ignoreIncompleteToolCalls: true,
        })

        writeTransientStatus(writer, {
          label: '正在连接模型',
          stage: 'connecting',
        })
        const result = streamText({
          model: provider.chatModel(config.model),
          system: buildEditorChatSystemPrompt(context),
          messages: modelMessages,
          tools,
          prepareStep: async ({ stepNumber, steps = [] }) => {
            if (forceFetchTranscript && stepNumber === 0) {
              return {
                activeTools: ['fetchTranscript'],
                toolChoice: { type: 'tool', toolName: 'fetchTranscript' },
              }
            }
            if (forceFetchPageMarkdown && stepNumber === 0) {
              return {
                activeTools: ['fetchPageMarkdown'],
                toolChoice: { type: 'tool', toolName: 'fetchPageMarkdown' },
              }
            }
            if (forceInsertMarkdown) {
              const fetchWasRequired =
                hasTranscriptSourceIntent ||
                hasPageSourceIntent ||
                latestTurnHasSourceFetch
              const sourceReady =
                !fetchWasRequired ||
                latestTurnHasSuccessfulSourceFetch ||
                stepsHaveSuccessfulToolOutput(steps, [
                  'fetchTranscript',
                  'fetchPageMarkdown',
                ])
              const shouldInsertNow =
                stepNumber === 0
                  ? !fetchWasRequired || latestTurnHasSuccessfulSourceFetch
                  : sourceReady

              if (shouldInsertNow) {
                return {
                  activeTools: ['insertMarkdownIntoArticle'],
                  toolChoice: {
                    type: 'tool',
                    toolName: 'insertMarkdownIntoArticle',
                  },
                }
              }
            }
          },
          stopWhen: stepCountIs(EDITOR_CHAT_MAX_STEPS),
          ...(usesAnthropicCompatibleProvider
            ? {}
            : { temperature: config.temperature }),
          maxOutputTokens: config.maxTokens,
          maxRetries: 1,
          timeout: EDITOR_CHAT_TIMEOUT,
          abortSignal: req.signal,
          onError({ error }) {
            console.error(
              'editor ai chat stream error:',
              sanitizeAiErrorMessage(error),
            )
          },
          onFinish() {
            writeTransientStatus(writer, { label: '完成', stage: 'done' })
          },
        })

        writeTransientStatus(writer, { label: '正在思考', stage: 'thinking' })
        writer.merge(
          result.toUIMessageStream<EditorChatUIMessage>({
            sendStart: false,
            onError: (error) =>
              sanitizeAiErrorMessage(error, 'AI 对话失败，请稍后重试。'),
          }),
        )
      },
    })

    return createUIMessageStreamResponse({
      stream,
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    const message = sanitizeAiErrorMessage(error)
    return jsonError(message, 500)
  }
}
