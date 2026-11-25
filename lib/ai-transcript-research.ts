import {
  decryptApiKey,
  encryptApiKey,
  resolveAiConfigSecret,
} from '@/lib/ai-provider-profiles'
import {
  getAiResearchJobByNoteId,
  getAiResearchJobByTaskId,
  getAiResearchResourceByCanonicalUrl,
  getAiResearchResourceById,
  getLatestAiResearchJobForResource,
  linkAiResearchResource,
  normalizeResearchUrl,
  upsertAiResearchJob,
  upsertAiResearchResource,
  type AiResearchResource,
} from '@/lib/repositories/ai-research'
import { getSetting, setSetting } from '@/lib/repositories/settings'

export type AiTranscriptResearchEnv = Record<string, string | undefined>

export type TranscriptSource = 'getnote-web' | 'getnote-openapi'

export type FetchTranscriptOutput =
  | {
      status: 'success'
      resourceId?: number
      url: string
      finalUrl?: string
      noteId?: string
      taskId?: string
      title?: string
      originalTitle?: string
      platform: string
      summary?: string
      transcript: string
      excerpt: string
      source: TranscriptSource
      truncated: boolean
    }
  | {
      status: 'processing'
      resourceId?: number
      url: string
      noteId?: string
      taskId?: string
      platform: string
      message: string
    }
  | {
      status: 'error'
      url: string
      platform?: string
      error: string
    }

type GetNoteTokens = {
  token?: string
  token_expire_at?: number
  refresh_token?: string
  refresh_token_expire_at?: number
}

type TranscriptDetail = {
  title?: string
  originalTitle?: string
  finalUrl?: string
  summary?: string
  transcript: string
  source: TranscriptSource
}

type ResearchLinkContext = {
  sessionId?: string | null
  postId?: number | null
  slug?: string | null
}

const GETNOTE_TOKENS_SETTING = 'getnote_web_tokens_encrypted'
const DEFAULT_TRANSCRIPT_CHARS = 16_000
const MAX_TRANSCRIPT_CHARS = 30_000
const DEFAULT_MAX_WAIT_SECONDS = 60
const MAX_WAIT_SECONDS = 90
const DEFAULT_POLL_INTERVAL_MS = 5000
const GETNOTE_TIMEOUT_MS = 20_000
const MAX_RESPONSE_CHARS = 2_000_000

function readFlag(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
  )
}

export function isAiTranscriptResearchEnabled(
  env?: AiTranscriptResearchEnv | null,
): boolean {
  return readFlag(
    env?.ENABLE_AI_TRANSCRIPT_RESEARCH ||
      process.env.ENABLE_AI_TRANSCRIPT_RESEARCH ||
      env?.ENABLE_AI_WEB_RESEARCH ||
      process.env.ENABLE_AI_WEB_RESEARCH,
  )
}

function clampInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN
  if (!Number.isInteger(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function withTimeout(ms: number) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  }
}

function sanitizeErrorMessage(error: unknown, fallback: string) {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : fallback
  const message = raw
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/gk_live_[A-Za-z0-9._-]+/g, 'gk_live_[redacted]')
    .replace(/\s+/g, ' ')
    .trim()
  return message || fallback
}

function normalizePublicUrl(input: string): URL {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('URL 不能为空')

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error('URL 格式无效')
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('只支持 http 和 https URL')
  }

  const hostname = url.hostname.toLowerCase()
  if (
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.localhost')
  ) {
    throw new Error('不允许抓取本地或内网站点')
  }

  if (isBlockedIpAddress(hostname)) {
    throw new Error('不允许抓取内网地址')
  }

  return url
}

function isBlockedIpAddress(hostname: string) {
  if (hostname.includes(':')) return isBlockedIpv6(hostname)

  const parts = hostname.split('.')
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part)))
    return false

  const bytes = parts.map((part) => Number.parseInt(part, 10))
  if (bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255))
    return false

  const [a, b] = bytes
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  )
}

function isBlockedIpv6(hostname: string) {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  return (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:') ||
    normalized.startsWith('ff')
  )
}

export function detectTranscriptPlatform(input: string): string {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return 'unknown'
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
  if (hostname === 'xiaoyuzhoufm.com' || hostname.endsWith('.xiaoyuzhoufm.com'))
    return 'xiaoyuzhou'
  if (
    hostname === 'youtube.com' ||
    hostname.endsWith('.youtube.com') ||
    hostname === 'youtu.be'
  )
    return 'youtube'
  if (
    hostname === 'bilibili.com' ||
    hostname.endsWith('.bilibili.com') ||
    hostname === 'b23.tv'
  )
    return 'bilibili'
  return 'unknown'
}

export function isSupportedTranscriptUrl(input: string): boolean {
  return detectTranscriptPlatform(input) !== 'unknown'
}

function getRequiredCredential(
  env: AiTranscriptResearchEnv | null | undefined,
  key: string,
) {
  return (env?.[key] || process.env[key] || '').trim()
}

async function readResponseText(response: Response, maxChars: number) {
  if (!response.body) return (await response.text()).slice(0, maxChars)

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let output = ''

  try {
    while (output.length < maxChars) {
      const { done, value } = await reader.read()
      if (done) break
      output += decoder.decode(value, { stream: true })
      if (output.length >= maxChars) break
    }
    output += decoder.decode()
    return output.slice(0, maxChars)
  } finally {
    reader.releaseLock()
    await response.body.cancel().catch(() => undefined)
  }
}

async function readJsonResponse(response: Response) {
  const text = await readResponseText(response, MAX_RESPONSE_CHARS)
  if (!text.trim()) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error('响应不是有效 JSON')
  }
}

async function fetchJson({
  url,
  fetcher,
  init,
}: {
  url: string
  fetcher: typeof fetch
  init?: RequestInit
}) {
  const timeout = withTimeout(GETNOTE_TIMEOUT_MS)
  try {
    const response = await fetcher(url, {
      ...init,
      signal: timeout.signal,
    })
    const data = await readJsonResponse(response)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return data
  } finally {
    timeout.clear()
  }
}

function getPathString(value: unknown, path: string[]) {
  let current = value
  for (const key of path) {
    if (!current || typeof current !== 'object') return ''
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === 'string' ? current.trim() : ''
}

function getPathNumber(value: unknown, path: string[]) {
  let current = value
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === 'number' && Number.isFinite(current)
    ? current
    : undefined
}

function getPathArray(value: unknown, path: string[]) {
  let current = value
  for (const key of path) {
    if (!current || typeof current !== 'object') return []
    current = (current as Record<string, unknown>)[key]
  }
  return Array.isArray(current) ? current : []
}

function assertOpenApiSuccess(data: unknown) {
  if (!data || typeof data !== 'object') throw new Error('Get笔记响应为空')
  const root = data as Record<string, unknown>
  if (root.success === false) {
    const message =
      typeof root.message === 'string' ? root.message : 'Get笔记请求失败'
    throw new Error(message)
  }
  const code = getPathNumber(root, ['code'])
  if (code !== undefined && code !== 0) {
    throw new Error(
      getPathString(root, ['message']) || `Get笔记请求失败：${code}`,
    )
  }
}

async function getnoteOpenApiRequest({
  method,
  path,
  body,
  env,
  fetcher,
}: {
  method: 'GET' | 'POST'
  path: string
  body?: unknown
  env?: AiTranscriptResearchEnv | null
  fetcher: typeof fetch
}) {
  const apiKey = getRequiredCredential(env, 'GETNOTE_API_KEY')
  const clientId = getRequiredCredential(env, 'GETNOTE_CLIENT_ID')
  if (!apiKey || !clientId) {
    throw new Error('缺少 GETNOTE_API_KEY 或 GETNOTE_CLIENT_ID')
  }

  const data = await fetchJson({
    url: `https://openapi.biji.com${path}`,
    fetcher,
    init: {
      method,
      headers: {
        Authorization: apiKey,
        'X-Client-ID': clientId,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  })
  assertOpenApiSuccess(data)
  return data
}

function extractTaskId(data: unknown) {
  const direct = getPathString(data, ['data', 'task_id'])
  if (direct) return direct
  const tasks = getPathArray(data, ['data', 'tasks'])
  const first = tasks[0]
  return getPathString(first, ['task_id']) || getPathString(first, ['id'])
}

function extractNoteId(data: unknown) {
  return (
    getPathString(data, ['data', 'note_id']) ||
    getPathString(data, ['data', 'id']) ||
    getPathString(data, ['data', 'note', 'id'])
  )
}

async function loadStoredTokens(
  db: D1Database | undefined,
  env?: AiTranscriptResearchEnv | null,
) {
  if (!db) return null
  const encrypted = await getSetting(db, GETNOTE_TOKENS_SETTING)
  if (!encrypted) return null

  const secret = resolveAiConfigSecret(env || undefined)
  const plain = await decryptApiKey(encrypted, secret)
  if (!plain) return null

  try {
    return JSON.parse(plain) as GetNoteTokens
  } catch {
    return null
  }
}

function loadEnvTokens(
  env?: AiTranscriptResearchEnv | null,
): GetNoteTokens | null {
  const token = getRequiredCredential(env, 'GETNOTE_WEB_TOKEN')
  const refreshToken = getRequiredCredential(env, 'GETNOTE_WEB_REFRESH_TOKEN')
  if (!token && !refreshToken) return null

  return {
    token,
    refresh_token: refreshToken,
    token_expire_at: clampInteger(
      getRequiredCredential(env, 'GETNOTE_WEB_TOKEN_EXPIRES_AT'),
      0,
      0,
      Number.MAX_SAFE_INTEGER,
    ),
    refresh_token_expire_at: clampInteger(
      getRequiredCredential(env, 'GETNOTE_WEB_REFRESH_TOKEN_EXPIRES_AT'),
      0,
      0,
      Number.MAX_SAFE_INTEGER,
    ),
  }
}

async function saveStoredTokens(
  db: D1Database | undefined,
  env: AiTranscriptResearchEnv | null | undefined,
  tokens: GetNoteTokens,
) {
  if (!db) return
  const secret = resolveAiConfigSecret(env || undefined)
  const encrypted = await encryptApiKey(JSON.stringify(tokens), secret)
  await setSetting(db, GETNOTE_TOKENS_SETTING, encrypted)
}

async function refreshGetNoteJwt({
  refreshToken,
  fetcher,
}: {
  refreshToken: string
  fetcher: typeof fetch
}) {
  const data = await fetchJson({
    url: 'https://notes-api.biji.com/account/v2/web/user/auth/refresh',
    fetcher,
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://www.biji.com',
        Referer: 'https://www.biji.com/',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
  })
  const code = getPathNumber(data, ['h', 'c'])
  if (code !== 0) {
    throw new Error(
      getPathString(data, ['h', 'm']) || 'Get笔记 Web token 刷新失败',
    )
  }

  const token = getPathString(data, ['c', 'token'])
  if (!token) throw new Error('Get笔记 Web token 刷新结果为空')

  return {
    token,
    token_expire_at: getPathNumber(data, ['c', 'token_expire_at']),
    refresh_token: getPathString(data, ['c', 'refresh_token']) || refreshToken,
    refresh_token_expire_at: getPathNumber(data, [
      'c',
      'refresh_token_expire_at',
    ]),
  } satisfies GetNoteTokens
}

async function getValidWebJwt({
  db,
  env,
  fetcher,
}: {
  db?: D1Database
  env?: AiTranscriptResearchEnv | null
  fetcher: typeof fetch
}) {
  const tokens = (await loadStoredTokens(db, env)) || loadEnvTokens(env)
  if (!tokens) return ''

  const now = Math.floor(Date.now() / 1000)
  const refreshToken = (tokens.refresh_token || '').trim()
  if (tokens.refresh_token_expire_at && now >= tokens.refresh_token_expire_at) {
    throw new Error('Get笔记 refresh_token 已过期，需要重新授权')
  }

  if (
    tokens.token &&
    (!tokens.token_expire_at || now < tokens.token_expire_at - 300)
  ) {
    return tokens.token
  }

  if (!refreshToken) return ''
  const refreshed = await refreshGetNoteJwt({ refreshToken, fetcher })
  const nextTokens: GetNoteTokens = {
    ...tokens,
    token: refreshed.token,
    token_expire_at: refreshed.token_expire_at || tokens.token_expire_at,
    refresh_token: refreshed.refresh_token || tokens.refresh_token,
    refresh_token_expire_at:
      refreshed.refresh_token_expire_at || tokens.refresh_token_expire_at,
  }
  await saveStoredTokens(db, env, nextTokens)
  return nextTokens.token || ''
}

function stripTranscriptForExcerpt(transcript: string) {
  return transcript
    .replace(/\[[0-9:.]+\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeTranscriptContent(value: string) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function sha256Hex(value: string) {
  if (!value) return ''
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

function buildTranscriptExcerpt(summary: string, transcript: string) {
  const source = summary || stripTranscriptForExcerpt(transcript)
  return source.replace(/\s+/g, ' ').trim().slice(0, 500)
}

async function linkResourceIfPossible(
  db: D1Database | undefined,
  resourceId: number | undefined,
  context?: ResearchLinkContext,
) {
  if (!db || !resourceId) return
  await linkAiResearchResource(db, {
    resourceId,
    sessionId: context?.sessionId,
    postId: context?.postId,
    slug: context?.slug,
    role: 'source',
  })
}

async function persistProcessingResource({
  db,
  url,
  platform,
  taskId,
  noteId,
  rawStatus,
  context,
}: {
  db?: D1Database
  url: string
  platform: string
  taskId?: string
  noteId?: string
  rawStatus?: string
  context?: ResearchLinkContext
}) {
  if (!db || !url.trim()) return undefined
  const resource = await upsertAiResearchResource(db, {
    sourceType: 'transcript',
    url,
    canonicalUrl: normalizeResearchUrl(url),
    platform,
    provider: 'getnote',
    status: 'processing',
  })
  await upsertAiResearchJob(db, {
    resourceId: resource.id,
    provider: 'getnote',
    providerTaskId: taskId,
    providerNoteId: noteId,
    status: 'processing',
    rawStatus,
    lastPolledAt: Math.floor(Date.now() / 1000),
  })
  await linkResourceIfPossible(db, resource.id, context)
  return resource
}

async function persistReadyResource({
  db,
  url,
  platform,
  taskId,
  noteId,
  detail,
  context,
}: {
  db?: D1Database
  url: string
  platform: string
  taskId?: string
  noteId?: string
  detail: TranscriptDetail
  context?: ResearchLinkContext
}) {
  if (!db || !(detail.finalUrl || url).trim()) return undefined
  const resourceUrl = detail.finalUrl || url
  const contentHash = await sha256Hex(detail.transcript)
  const resource = await upsertAiResearchResource(db, {
    sourceType: 'transcript',
    url: resourceUrl,
    canonicalUrl: normalizeResearchUrl(resourceUrl),
    platform,
    provider: 'getnote',
    status: 'ready',
    title: detail.title || detail.originalTitle || '',
    summary: detail.summary || '',
    excerpt: buildTranscriptExcerpt(detail.summary || '', detail.transcript),
    contentText: detail.transcript,
    contentHash,
  })
  await upsertAiResearchJob(db, {
    resourceId: resource.id,
    provider: 'getnote',
    providerTaskId: taskId,
    providerNoteId: noteId,
    status: 'ready',
    rawStatus: 'ready',
    lastPolledAt: Math.floor(Date.now() / 1000),
  })
  await linkResourceIfPossible(db, resource.id, context)
  return resource
}

async function persistFailedResource({
  db,
  url,
  platform,
  taskId,
  noteId,
  error,
  context,
}: {
  db?: D1Database
  url: string
  platform: string
  taskId?: string
  noteId?: string
  error: string
  context?: ResearchLinkContext
}) {
  if (!db || !url.trim()) return undefined
  const resource = await upsertAiResearchResource(db, {
    sourceType: 'transcript',
    url,
    canonicalUrl: normalizeResearchUrl(url),
    platform,
    provider: 'getnote',
    status: 'failed',
    errorMessage: error,
  })
  await upsertAiResearchJob(db, {
    resourceId: resource.id,
    provider: 'getnote',
    providerTaskId: taskId,
    providerNoteId: noteId,
    status: 'failed',
    rawStatus: 'failed',
    errorMessage: error,
    lastPolledAt: Math.floor(Date.now() / 1000),
  })
  await linkResourceIfPossible(db, resource.id, context)
  return resource
}

function buildOutputFromReadyResource(
  resource: AiResearchResource,
  outputMaxChars: number,
): FetchTranscriptOutput {
  const truncated = resource.content_text.length > outputMaxChars
  const transcript = truncated
    ? resource.content_text.slice(0, outputMaxChars).trimEnd()
    : resource.content_text
  return {
    status: 'success',
    resourceId: resource.id,
    url: resource.url,
    finalUrl: resource.canonical_url,
    title: resource.title || undefined,
    platform: resource.platform,
    summary: resource.summary || undefined,
    transcript,
    excerpt:
      resource.excerpt ||
      buildTranscriptExcerpt(resource.summary, resource.content_text),
    source: 'getnote-openapi',
    truncated,
  }
}

async function fetchWebTranscriptDetail({
  noteId,
  db,
  env,
  fetcher,
}: {
  noteId: string
  db?: D1Database
  env?: AiTranscriptResearchEnv | null
  fetcher: typeof fetch
}) {
  const jwt = await getValidWebJwt({ db, env, fetcher })
  if (!jwt) return null

  const data = await fetchJson({
    url: `https://get-notes.luojilab.com/voicenotes/web/notes/${encodeURIComponent(noteId)}/links/detail`,
    fetcher,
    init: {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
        Origin: 'https://www.biji.com',
        Referer: 'https://www.biji.com/',
      },
    },
  })
  const code = getPathNumber(data, ['h', 'c'])
  if (code !== 0) {
    throw new Error(
      getPathString(data, ['h', 'm']) || 'Get笔记完整转写获取失败',
    )
  }

  const content = normalizeTranscriptContent(
    getPathString(data, ['c', 'content']),
  )
  if (!content) return null
  return {
    title: getPathString(data, ['c', 'title']),
    originalTitle: getPathString(data, ['c', 'web_title']),
    finalUrl: getPathString(data, ['c', 'url']),
    transcript: content,
    source: 'getnote-web' as const,
  }
}

async function fetchOpenApiTranscriptDetail({
  noteId,
  env,
  fetcher,
}: {
  noteId: string
  env?: AiTranscriptResearchEnv | null
  fetcher: typeof fetch
}) {
  const data = await getnoteOpenApiRequest({
    method: 'GET',
    path: `/open/api/v1/resource/note/detail?id=${encodeURIComponent(noteId)}`,
    env,
    fetcher,
  })

  const note =
    data && typeof data === 'object'
      ? (data as Record<string, unknown>).data
      : null
  const noteObject =
    note && typeof note === 'object' && (note as Record<string, unknown>).note
      ? (note as Record<string, unknown>).note
      : note

  const summary = normalizeTranscriptContent(
    getPathString(noteObject, ['content']),
  )
  const content = normalizeTranscriptContent(
    getPathString(noteObject, ['audio', 'transcript']) ||
      getPathString(noteObject, ['web_page', 'content']) ||
      getPathString(noteObject, ['ref_content']) ||
      summary,
  )
  if (!content) return null

  return {
    title: getPathString(noteObject, ['title']),
    originalTitle: getPathString(noteObject, ['web_page', 'title']),
    finalUrl: getPathString(noteObject, ['web_page', 'url']),
    summary,
    transcript: content,
    source: 'getnote-openapi' as const,
  }
}

function buildSuccessOutput({
  url,
  platform,
  noteId,
  taskId,
  detail,
  outputMaxChars,
  resourceId,
}: {
  url: string
  platform: string
  noteId?: string
  taskId?: string
  detail: TranscriptDetail
  outputMaxChars: number
  resourceId?: number
}): FetchTranscriptOutput {
  const truncated = detail.transcript.length > outputMaxChars
  const transcript = truncated
    ? detail.transcript.slice(0, outputMaxChars).trimEnd()
    : detail.transcript
  return {
    status: 'success',
    resourceId,
    url,
    finalUrl: detail.finalUrl || url,
    noteId,
    taskId,
    title: detail.title || detail.originalTitle || undefined,
    originalTitle: detail.originalTitle || undefined,
    platform,
    summary: detail.summary || undefined,
    transcript,
    excerpt: buildTranscriptExcerpt(detail.summary || '', detail.transcript),
    source: detail.source,
    truncated,
  }
}

async function resolveTranscriptDetail({
  noteId,
  url,
  platform,
  taskId,
  outputMaxChars,
  db,
  env,
  fetcher,
  context,
}: {
  noteId: string
  url: string
  platform: string
  taskId?: string
  outputMaxChars: number
  db?: D1Database
  env?: AiTranscriptResearchEnv | null
  fetcher: typeof fetch
  context?: ResearchLinkContext
}): Promise<FetchTranscriptOutput> {
  const openApiDetail = await fetchOpenApiTranscriptDetail({
    noteId,
    env,
    fetcher,
  })
  const webDetail = await fetchWebTranscriptDetail({
    noteId,
    db,
    env,
    fetcher,
  }).catch((error) => {
    console.warn(
      'GetNote web transcript unavailable:',
      sanitizeErrorMessage(error, 'Get笔记完整转写获取失败'),
    )
    return null
  })
  const detail = webDetail
    ? { ...webDetail, summary: openApiDetail?.summary || '' }
    : openApiDetail
  if (detail) {
    const outputUrl = detail.finalUrl || url
    if (!outputUrl) {
      return {
        status: 'error',
        url,
        platform,
        error:
          'Get笔记已创建笔记，但结果里没有返回来源 URL；请带原始链接重试。',
      }
    }
    const outputPlatform =
      platform === 'unknown' || !platform
        ? detectTranscriptPlatform(outputUrl)
        : platform
    const resource = await persistReadyResource({
      db,
      url: outputUrl,
      platform: outputPlatform,
      taskId,
      noteId,
      detail,
      context,
    })
    return buildSuccessOutput({
      url: outputUrl,
      platform: outputPlatform,
      noteId,
      taskId,
      detail,
      outputMaxChars,
      resourceId: resource?.id,
    })
  }

  return {
    status: 'error',
    url,
    platform,
    error:
      'Get笔记已创建笔记，但暂时没有返回可用文字稿；如果是新音视频，请稍后再试。',
  }
}

export async function fetchTranscript({
  url,
  taskId,
  noteId,
  resourceId,
  maxChars,
  maxWaitSeconds,
  env,
  db,
  context,
  fetcher = fetch,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: {
  url?: string
  taskId?: string
  noteId?: string
  resourceId?: number
  maxChars?: number
  maxWaitSeconds?: number
  env?: AiTranscriptResearchEnv | null
  db?: D1Database
  context?: ResearchLinkContext
  fetcher?: typeof fetch
  pollIntervalMs?: number
}): Promise<FetchTranscriptOutput> {
  const targetUrl = url?.trim() || ''
  try {
    if (!targetUrl && !taskId?.trim() && !noteId?.trim() && !resourceId) {
      return {
        status: 'error',
        url: '',
        error: 'URL、taskId、noteId 不能都为空',
      }
    }

    const outputMaxChars = clampInteger(
      maxChars,
      DEFAULT_TRANSCRIPT_CHARS,
      1000,
      MAX_TRANSCRIPT_CHARS,
    )
    const waitSeconds = clampInteger(
      maxWaitSeconds,
      DEFAULT_MAX_WAIT_SECONDS,
      0,
      MAX_WAIT_SECONDS,
    )

    if (db && resourceId) {
      const resource = await getAiResearchResourceById(db, resourceId)
      if (!resource)
        return {
          status: 'error',
          url: targetUrl,
          error: '没有找到对应素材资源',
        }
      await linkResourceIfPossible(db, resource.id, context)
      if (resource.status === 'ready' && resource.content_text) {
        return buildOutputFromReadyResource(resource, outputMaxChars)
      }
      const job = await getLatestAiResearchJobForResource(
        db,
        resource.id,
        'getnote',
      )
      if (job?.provider_note_id) noteId = job.provider_note_id
      else if (job?.provider_task_id) taskId = job.provider_task_id
      if (!targetUrl) {
        url = resource.url
      }
    }

    if (db && taskId?.trim() && !noteId?.trim()) {
      const job = await getAiResearchJobByTaskId(db, 'getnote', taskId.trim())
      if (job?.provider_note_id) noteId = job.provider_note_id
      if (!url && job) {
        const resource = await getAiResearchResourceById(db, job.resource_id)
        if (resource) url = resource.url
      }
    }

    if (db && noteId?.trim() && !url) {
      const job = await getAiResearchJobByNoteId(db, 'getnote', noteId.trim())
      if (job) {
        const resource = await getAiResearchResourceById(db, job.resource_id)
        if (resource) url = resource.url
      }
    }

    const normalizedUrl =
      targetUrl || url
        ? normalizePublicUrl((url || targetUrl).trim()).toString()
        : ''
    const platform = detectTranscriptPlatform(normalizedUrl)
    if (normalizedUrl && platform === 'unknown') {
      return {
        status: 'error',
        url: normalizedUrl,
        error: '暂不支持此链接的音视频文字稿获取',
      }
    }

    if (!isAiTranscriptResearchEnabled(env)) {
      return {
        status: 'error',
        url: normalizedUrl,
        platform,
        error: '音视频文字稿能力未开启',
      }
    }

    if (noteId?.trim()) {
      return resolveTranscriptDetail({
        noteId: noteId.trim(),
        url: normalizedUrl,
        platform,
        taskId: taskId?.trim(),
        outputMaxChars,
        db,
        env,
        fetcher,
        context,
      })
    }

    if (db && normalizedUrl) {
      const existing = await getAiResearchResourceByCanonicalUrl(
        db,
        normalizeResearchUrl(normalizedUrl),
      )
      if (existing) {
        await linkResourceIfPossible(db, existing.id, context)
        if (existing.status === 'ready' && existing.content_text) {
          return buildOutputFromReadyResource(existing, outputMaxChars)
        }
        const job = await getLatestAiResearchJobForResource(
          db,
          existing.id,
          'getnote',
        )
        if (job?.provider_note_id) {
          return resolveTranscriptDetail({
            noteId: job.provider_note_id,
            url: existing.url,
            platform: existing.platform || platform,
            taskId: job.provider_task_id || undefined,
            outputMaxChars,
            db,
            env,
            fetcher,
            context,
          })
        }
        if (job?.provider_task_id && !taskId) taskId = job.provider_task_id
      }
    }

    if (taskId?.trim()) {
      const progress = await getnoteOpenApiRequest({
        method: 'POST',
        path: '/open/api/v1/resource/note/task/progress',
        env,
        fetcher,
        body: { task_id: taskId.trim() },
      })
      const status = getPathString(progress, ['data', 'status'])
      const progressNoteId = extractNoteId(progress)
      if (status === 'failed') {
        await persistFailedResource({
          db,
          url: normalizedUrl,
          platform,
          taskId: taskId.trim(),
          error: 'Get笔记转写任务失败',
          context,
        })
        return {
          status: 'error',
          url: normalizedUrl,
          platform,
          error: 'Get笔记转写任务失败',
        }
      }
      if (progressNoteId) {
        return resolveTranscriptDetail({
          noteId: progressNoteId,
          url: normalizedUrl,
          platform,
          taskId: taskId.trim(),
          outputMaxChars,
          db,
          env,
          fetcher,
          context,
        })
      }
      const resource = await persistProcessingResource({
        db,
        url: normalizedUrl,
        platform,
        taskId: taskId.trim(),
        rawStatus: status,
        context,
      })
      return {
        status: 'processing',
        resourceId: resource?.id,
        url: normalizedUrl,
        taskId: taskId.trim(),
        platform,
        message:
          'Get笔记仍在处理音视频文字稿，请稍后再次让 AI 获取该链接内容。',
      }
    }

    const createResult = await getnoteOpenApiRequest({
      method: 'POST',
      path: '/open/api/v1/resource/note/save',
      env,
      fetcher,
      body: {
        note_type: 'link',
        link_url: normalizedUrl,
      },
    })

    const createdTaskId = extractTaskId(createResult)
    const immediateNoteId = extractNoteId(createResult)
    if (immediateNoteId) {
      return resolveTranscriptDetail({
        noteId: immediateNoteId,
        url: normalizedUrl,
        platform,
        taskId: createdTaskId,
        outputMaxChars,
        db,
        env,
        fetcher,
        context,
      })
    }

    if (!createdTaskId) {
      return {
        status: 'error',
        url: normalizedUrl,
        platform,
        error: 'Get笔记没有返回任务 ID',
      }
    }

    if (waitSeconds === 0) {
      const resource = await persistProcessingResource({
        db,
        url: normalizedUrl,
        platform,
        taskId: createdTaskId,
        rawStatus: 'processing',
        context,
      })
      return {
        status: 'processing',
        resourceId: resource?.id,
        url: normalizedUrl,
        taskId: createdTaskId,
        platform,
        message:
          'Get笔记已开始处理音视频文字稿，请稍后再次让 AI 获取该链接内容。',
      }
    }

    const startedAt = Date.now()
    let firstPoll = true
    while (Date.now() - startedAt <= waitSeconds * 1000) {
      if (firstPoll) {
        firstPoll = false
      } else {
        const remainingMs = waitSeconds * 1000 - (Date.now() - startedAt)
        if (remainingMs <= 0) break
        await sleep(Math.min(Math.max(0, pollIntervalMs), remainingMs))
      }
      const progress = await getnoteOpenApiRequest({
        method: 'POST',
        path: '/open/api/v1/resource/note/task/progress',
        env,
        fetcher,
        body: { task_id: createdTaskId },
      })
      const status = getPathString(progress, ['data', 'status'])
      const noteId = extractNoteId(progress)
      if (status === 'failed') {
        await persistFailedResource({
          db,
          url: normalizedUrl,
          platform,
          taskId: createdTaskId,
          error: 'Get笔记转写任务失败',
          context,
        })
        return {
          status: 'error',
          url: normalizedUrl,
          platform,
          error: 'Get笔记转写任务失败',
        }
      }
      if (noteId) {
        return resolveTranscriptDetail({
          noteId,
          url: normalizedUrl,
          platform,
          taskId: createdTaskId,
          outputMaxChars,
          db,
          env,
          fetcher,
          context,
        })
      }
    }

    const resource = await persistProcessingResource({
      db,
      url: normalizedUrl,
      platform,
      taskId: createdTaskId,
      rawStatus: 'processing',
      context,
    })
    return {
      status: 'processing',
      resourceId: resource?.id,
      url: normalizedUrl,
      taskId: createdTaskId,
      platform,
      message:
        'Get笔记已开始处理音视频文字稿，请稍后再次让 AI 获取该链接内容。',
    }
  } catch (error) {
    return {
      status: 'error',
      url: targetUrl,
      platform: detectTranscriptPlatform(targetUrl),
      error: sanitizeErrorMessage(error, '音视频文字稿获取失败'),
    }
  }
}
