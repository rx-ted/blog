export type AiWebResearchEnv = Record<string, string | undefined>

export type WebSearchResult = {
  title: string
  url: string
  snippet: string
  source?: string
}

export type WebSearchOutput =
  | {
      status: 'success'
      query: string
      results: WebSearchResult[]
    }
  | {
      status: 'error'
      query: string
      results: []
      error: string
    }

export type FetchPageMarkdownOutput =
  | {
      status: 'success'
      url: string
      finalUrl?: string
      title?: string
      markdown: string
      excerpt: string
      source: PageMarkdownSource
      truncated: boolean
    }
  | {
      status: 'error'
      url: string
      source?: PageMarkdownSource
      error: string
    }

const DEFAULT_SEARCH_LIMIT = 5
const MAX_SEARCH_LIMIT = 10
const SEARCH_TIMEOUT_MS = 12_000
const FETCH_TIMEOUT_MS = 20_000
const MAX_RESPONSE_CHARS = 1_000_000
const DEFAULT_MARKDOWN_CHARS = 12_000
const MAX_MARKDOWN_CHARS = 20_000
const MAX_REDIRECTS = 3

type MarkdownProxySource = 'jina' | 'defuddle' | 'curlmd'
type TwitterProvider = 'fxtwitter' | 'vxtwitter'
type PageMarkdownSource = MarkdownProxySource | TwitterProvider

type TwitterStatusTarget = {
  username: string
  statusId: string
}

function readFlag(value: unknown): boolean {
  return (
    typeof value === 'string' &&
    ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
  )
}

export function isAiWebResearchEnabled(env?: AiWebResearchEnv | null): boolean {
  return readFlag(
    env?.ENABLE_AI_WEB_RESEARCH || process.env.ENABLE_AI_WEB_RESEARCH,
  )
}

function getPipeLlmApiKey(env?: AiWebResearchEnv | null): string {
  return (env?.PIPELLM_API_KEY || process.env.PIPELLM_API_KEY || '').trim()
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
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, 'sk-[redacted]')
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
  if (hostname.includes(':')) {
    return isBlockedIpv6(hostname)
  }

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

function normalizeSearchResult(value: unknown): WebSearchResult | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const title = typeof row.title === 'string' ? row.title.trim() : ''
  const url =
    typeof row.link === 'string'
      ? row.link.trim()
      : typeof row.url === 'string'
        ? row.url.trim()
        : ''
  const snippet =
    typeof row.snippet === 'string'
      ? row.snippet.trim()
      : typeof row.description === 'string'
        ? row.description.trim()
        : typeof row.content === 'string'
          ? row.content.trim()
          : ''
  const source =
    typeof row.source === 'string'
      ? row.source.trim()
      : typeof row.displayed_link === 'string'
        ? row.displayed_link.trim()
        : undefined

  if (!title && !url && !snippet) return null
  const result: WebSearchResult = {
    title: title || '未命名结果',
    url,
    snippet,
  }
  if (source) result.source = source
  return result
}

export async function searchWeb({
  query,
  limit,
  env,
  fetcher = fetch,
}: {
  query: string
  limit?: number
  env?: AiWebResearchEnv | null
  fetcher?: typeof fetch
}): Promise<WebSearchOutput> {
  const normalizedQuery = query.trim().slice(0, 300)
  if (!normalizedQuery) {
    return {
      status: 'error',
      query: '',
      results: [],
      error: '搜索关键词不能为空',
    }
  }

  if (!isAiWebResearchEnabled(env)) {
    return {
      status: 'error',
      query: normalizedQuery,
      results: [],
      error: '网页研究能力未开启',
    }
  }

  const apiKey = getPipeLlmApiKey(env)
  if (!apiKey) {
    return {
      status: 'error',
      query: normalizedQuery,
      results: [],
      error: '缺少 PIPELLM_API_KEY',
    }
  }

  const requestLimit = clampInteger(
    limit,
    DEFAULT_SEARCH_LIMIT,
    1,
    MAX_SEARCH_LIMIT,
  )
  const url = new URL('https://api.pipellm.ai/v1/websearch/search')
  url.searchParams.set('q', normalizedQuery)
  url.searchParams.set('limit', String(requestLimit))

  const timeout = withTimeout(SEARCH_TIMEOUT_MS)
  try {
    const response = await fetcher(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: timeout.signal,
    })

    if (!response.ok) {
      return {
        status: 'error',
        query: normalizedQuery,
        results: [],
        error: `搜索失败：HTTP ${response.status}`,
      }
    }

    const data = (await response.json().catch(() => null)) as unknown
    const inner =
      data && typeof data === 'object'
        ? (data as Record<string, unknown>).data
        : null
    const organic =
      inner && typeof inner === 'object'
        ? (inner as Record<string, unknown>).organic
        : inner
    const rawResults = Array.isArray(organic) ? organic : []
    const results = rawResults
      .map(normalizeSearchResult)
      .filter((result): result is WebSearchResult => Boolean(result))
      .slice(0, requestLimit)

    return { status: 'success', query: normalizedQuery, results }
  } catch (error) {
    return {
      status: 'error',
      query: normalizedQuery,
      results: [],
      error: sanitizeErrorMessage(error, '搜索失败'),
    }
  } finally {
    timeout.clear()
  }
}

function buildMarkdownProxyUrl(source: MarkdownProxySource, targetUrl: string) {
  switch (source) {
    case 'jina':
      return `https://r.jina.ai/${targetUrl}`
    case 'defuddle':
      return `https://defuddle.md/${targetUrl}`
    case 'curlmd':
      return `https://curl.md/${targetUrl}`
  }
}

function parseTwitterStatusUrl(input: string): TwitterStatusTarget | null {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return null
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
  if (!['x.com', 'twitter.com', 'mobile.twitter.com'].includes(hostname))
    return null

  const parts = url.pathname.split('/').filter(Boolean)
  const statusIndex = parts.findIndex(
    (part) => part === 'status' || part === 'statuses',
  )
  if (statusIndex <= 0) return null

  const username = parts[statusIndex - 1]
  const statusId = parts[statusIndex + 1]
  if (!username || !/^\d{5,}$/.test(statusId || '')) return null

  return { username, statusId }
}

function looksLikeUsefulMarkdown(content: string) {
  const normalized = content.trim()
  if (!normalized) return false
  const lineCount = normalized
    .split(/\r?\n/)
    .filter((line) => line.trim()).length
  if (lineCount <= 5 && normalized.length < 500) return false
  return ![
    'Access Denied',
    '403 Forbidden',
    '404 Not Found',
    "Don't miss what's happening",
    'Don’t miss what’s happening',
    'People on X are the first to know',
    'New to X?',
    'Just a moment...',
  ].some((marker) => normalized.includes(marker))
}

function extractMarkdownTitle(markdown: string) {
  const yamlTitle = markdown
    .match(/^---[\s\S]*?\ntitle:\s*["']?(.+?)["']?\s*\n[\s\S]*?---/i)?.[1]
    ?.trim()
  if (yamlTitle) return yamlTitle.slice(0, 200)
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim()
  return heading ? heading.slice(0, 200) : undefined
}

function stripMarkdownForExcerpt(markdown: string) {
  return markdown
    .replace(/^---[\s\S]*?---\s*/m, '')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[`*_>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeMarkdownText(input: string) {
  return input.replace(/\r\n/g, '\n').trim()
}

function getNestedString(value: unknown, path: string[]) {
  let current = value
  for (const key of path) {
    if (!current || typeof current !== 'object') return ''
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === 'string' ? current.trim() : ''
}

function getNestedNumber(value: unknown, path: string[]) {
  let current = value
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === 'number' && Number.isFinite(current)
    ? current
    : undefined
}

function draftJsBlockToMarkdown(block: unknown) {
  if (!block || typeof block !== 'object') return ''
  const row = block as Record<string, unknown>
  const text = typeof row.text === 'string' ? escapeMarkdownText(row.text) : ''
  const type = typeof row.type === 'string' ? row.type : 'unstyled'

  if (!text) return ''
  switch (type) {
    case 'header-one':
      return `# ${text}`
    case 'header-two':
      return `## ${text}`
    case 'header-three':
      return `### ${text}`
    case 'unordered-list-item':
      return `- ${text}`
    case 'ordered-list-item':
      return `1. ${text}`
    case 'blockquote':
      return text
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')
    default:
      return text
  }
}

function buildTwitterMarkdown(
  data: unknown,
  originalUrl: string,
  provider: TwitterProvider,
) {
  const root =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  const tweet =
    root.tweet && typeof root.tweet === 'object'
      ? (root.tweet as Record<string, unknown>)
      : root
  const author =
    tweet.author && typeof tweet.author === 'object'
      ? (tweet.author as Record<string, unknown>)
      : {}
  const article =
    tweet.article && typeof tweet.article === 'object'
      ? (tweet.article as Record<string, unknown>)
      : root.article && typeof root.article === 'object'
        ? (root.article as Record<string, unknown>)
        : null

  const authorName =
    getNestedString(author, ['name']) || getNestedString(tweet, ['user_name'])
  const username =
    getNestedString(author, ['screen_name']) ||
    getNestedString(tweet, ['user_screen_name'])
  const tweetText =
    getNestedString(tweet, ['raw_text', 'text']) ||
    getNestedString(tweet, ['text'])
  const createdAt =
    getNestedString(tweet, ['created_at']) || getNestedString(root, ['date'])
  const tweetUrl =
    getNestedString(tweet, ['url']) ||
    getNestedString(tweet, ['tweetURL']) ||
    originalUrl
  const title = article
    ? getNestedString(article, ['title']) || 'X/Twitter Article'
    : `X/Twitter: ${authorName || username || 'Tweet'}`
  const preview = article ? getNestedString(article, ['preview_text']) : ''
  const views = getNestedNumber(tweet, ['views'])
  const likes =
    getNestedNumber(tweet, ['likes']) ?? getNestedNumber(root, ['likes'])
  const retweets =
    getNestedNumber(tweet, ['retweets']) ?? getNestedNumber(root, ['retweets'])
  const replies =
    getNestedNumber(tweet, ['replies']) ?? getNestedNumber(root, ['replies'])
  const bookmarks = getNestedNumber(tweet, ['bookmarks'])

  const lines: string[] = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `source: ${JSON.stringify(tweetUrl)}`,
    `provider: ${provider}`,
  ]
  if (authorName) lines.push(`author: ${JSON.stringify(authorName)}`)
  if (username) lines.push(`username: ${JSON.stringify(username)}`)
  if (createdAt) lines.push(`published: ${JSON.stringify(createdAt)}`)
  lines.push('---', '')

  if (article) {
    lines.push(`# ${title}`, '')
    if (preview) lines.push(`> ${preview.replace(/\n+/g, '\n> ')}`, '')
  } else {
    lines.push(`# ${title}`, '')
  }

  lines.push('## Tweet', '')
  if (tweetText) lines.push(tweetText, '')
  lines.push(`Source: ${tweetUrl}`, '')

  const stats = [
    views !== undefined ? `views: ${views}` : '',
    likes !== undefined ? `likes: ${likes}` : '',
    retweets !== undefined ? `retweets: ${retweets}` : '',
    replies !== undefined ? `replies: ${replies}` : '',
    bookmarks !== undefined ? `bookmarks: ${bookmarks}` : '',
  ].filter(Boolean)
  if (stats.length > 0) lines.push(`Stats: ${stats.join(' · ')}`, '')

  const blocks =
    article && article.content && typeof article.content === 'object'
      ? (article.content as Record<string, unknown>).blocks
      : undefined
  if (Array.isArray(blocks)) {
    const articleLines = blocks.map(draftJsBlockToMarkdown).filter(Boolean)

    if (articleLines.length > 0) {
      lines.push(
        '## Article Content',
        '',
        ...articleLines.flatMap((line) => [line, '']),
      )
    }
  }

  const markdown = lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return {
    title,
    markdown,
    excerpt: stripMarkdownForExcerpt(markdown).slice(0, 500),
  }
}

async function fetchTwitterMarkdownFallback({
  normalizedUrl,
  outputMaxChars,
  fetcher,
}: {
  normalizedUrl: string
  outputMaxChars: number
  fetcher: typeof fetch
}): Promise<FetchPageMarkdownOutput | null> {
  const target = parseTwitterStatusUrl(normalizedUrl)
  if (!target) return null

  const errors: string[] = []
  for (const provider of ['fxtwitter', 'vxtwitter'] as const) {
    const apiUrl = `https://api.${provider}.com/${encodeURIComponent(target.username)}/status/${encodeURIComponent(target.statusId)}`
    const timeout = withTimeout(FETCH_TIMEOUT_MS)
    try {
      const response = await fetcher(apiUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'qmblog-ai-web-research/1.0',
        },
        signal: timeout.signal,
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json().catch(() => null)
      const built = buildTwitterMarkdown(data, normalizedUrl, provider)
      if (!looksLikeUsefulMarkdown(built.markdown))
        throw new Error('内容不可用')

      const truncated = built.markdown.length > outputMaxChars
      return {
        status: 'success',
        url: normalizedUrl,
        finalUrl: apiUrl,
        title: built.title,
        markdown: truncated
          ? built.markdown.slice(0, outputMaxChars).trimEnd()
          : built.markdown,
        excerpt: built.excerpt,
        source: provider,
        truncated,
      }
    } catch (error) {
      errors.push(`${provider}: ${sanitizeErrorMessage(error, '抓取失败')}`)
    } finally {
      timeout.clear()
    }
  }

  return {
    status: 'error',
    url: normalizedUrl,
    error: errors.length > 0 ? errors.join('；') : 'X/Twitter 抓取失败',
  }
}

async function fetchTextWithRedirects({
  url,
  fetcher,
  timeoutMs,
}: {
  url: string
  fetcher: typeof fetch
  timeoutMs: number
}) {
  let current = normalizePublicUrl(url)
  for (
    let redirectCount = 0;
    redirectCount <= MAX_REDIRECTS;
    redirectCount += 1
  ) {
    const timeout = withTimeout(timeoutMs)
    try {
      const response = await fetcher(current.toString(), {
        redirect: 'manual',
        headers: {
          Accept: 'text/markdown,text/plain,text/html;q=0.8,*/*;q=0.5',
          'User-Agent': 'qmblog-ai-web-research/1.0',
        },
        signal: timeout.signal,
      })

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location')
        if (!location) throw new Error(`抓取失败：HTTP ${response.status}`)
        current = normalizePublicUrl(new URL(location, current).toString())
        continue
      }

      if (!response.ok) throw new Error(`抓取失败：HTTP ${response.status}`)

      const text = await readResponseText(response, MAX_RESPONSE_CHARS)
      return {
        finalUrl: current.toString(),
        text,
      }
    } finally {
      timeout.clear()
    }
  }

  throw new Error('抓取跳转次数过多')
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

export async function fetchPageMarkdown({
  url,
  maxChars,
  env,
  fetcher = fetch,
}: {
  url: string
  maxChars?: number
  env?: AiWebResearchEnv | null
  fetcher?: typeof fetch
}): Promise<FetchPageMarkdownOutput> {
  const targetUrl = url.trim()
  try {
    const normalizedUrl = normalizePublicUrl(targetUrl).toString()
    if (!isAiWebResearchEnabled(env)) {
      return {
        status: 'error',
        url: normalizedUrl,
        error: '网页研究能力未开启',
      }
    }

    const outputMaxChars = clampInteger(
      maxChars,
      DEFAULT_MARKDOWN_CHARS,
      1000,
      MAX_MARKDOWN_CHARS,
    )
    const errors: string[] = []
    const twitterFallback = await fetchTwitterMarkdownFallback({
      normalizedUrl,
      outputMaxChars,
      fetcher,
    })
    if (twitterFallback) {
      if (twitterFallback.status === 'success') return twitterFallback
      errors.push(twitterFallback.error)
    }

    for (const source of ['jina', 'defuddle', 'curlmd'] as const) {
      try {
        const proxyUrl = buildMarkdownProxyUrl(source, normalizedUrl)
        const fetched = await fetchTextWithRedirects({
          url: proxyUrl,
          fetcher,
          timeoutMs: FETCH_TIMEOUT_MS,
        })
        if (!looksLikeUsefulMarkdown(fetched.text)) {
          errors.push(`${source}: 内容不可用`)
          continue
        }

        const markdown = fetched.text.trim()
        const truncated = markdown.length > outputMaxChars
        const sliced = truncated
          ? markdown.slice(0, outputMaxChars).trimEnd()
          : markdown
        return {
          status: 'success',
          url: normalizedUrl,
          finalUrl: fetched.finalUrl,
          title: extractMarkdownTitle(markdown),
          markdown: sliced,
          excerpt: stripMarkdownForExcerpt(markdown).slice(0, 500),
          source,
          truncated,
        }
      } catch (error) {
        errors.push(`${source}: ${sanitizeErrorMessage(error, '抓取失败')}`)
      }
    }

    return {
      status: 'error',
      url: normalizedUrl,
      error: errors.length > 0 ? errors.join('；') : '页面抓取失败',
    }
  } catch (error) {
    return {
      status: 'error',
      url: targetUrl,
      error: sanitizeErrorMessage(error, '页面抓取失败'),
    }
  }
}
