import {
  linkMediaAssetToArticle,
  upsertMediaAsset,
} from '@/lib/repositories/media-assets'

const MAX_REMOTE_IMAGES = 40
const MAX_REMOTE_IMAGE_BYTES = 15 * 1024 * 1024
const MAX_REDIRECTS = 4
const FETCH_TIMEOUT_MS = 15_000
const DOWNLOAD_CONCURRENCY = 3

const SAFE_IMAGE_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
])

type StoredImageObject = {
  size?: number
  httpMetadata?: { contentType?: string }
  customMetadata?: Record<string, string>
}

export type RemoteImageBucket = {
  get: (key: string) => Promise<StoredImageObject | null>
  put: (
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream,
    options?: {
      httpMetadata?: {
        contentType?: string
        cacheControl?: string
      }
      customMetadata?: Record<string, string>
    },
  ) => Promise<void>
}

type RemoteImageCandidate = {
  sourceUrl: string
  rawValues: Set<string>
  role: 'inline' | 'cover'
}

export type LocalizedRemoteImage = {
  sourceUrl: string
  url: string
  key: string
  mimeType: string | null
  sizeBytes: number | null
  alt: string
  role: 'inline' | 'cover'
  reused: boolean
}

export type RemoteImageLocalizationFailure = {
  sourceUrl: string
  error: string
}

export type RemoteImageLocalizationReport = {
  found: number
  localized: number
  reused: number
  skipped: number
  failures: RemoteImageLocalizationFailure[]
  replacements: Record<string, string>
}

export type RemoteImageLocalizationResult = {
  content?: string
  html?: string
  coverImage?: string | null
  assets: LocalizedRemoteImage[]
  report: RemoteImageLocalizationReport
}

type LocalizeRemotePostImagesInput = {
  bucket?: RemoteImageBucket
  content?: string
  html?: string
  coverImage?: string | null
  siteUrl?: string
  fetchImpl?: typeof fetch
}

function decodeHtmlUrl(value: string) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&#38;/g, '&')
    .replace(/&#x26;/gi, '&')
}

function stripIpv6Brackets(hostname: string) {
  return hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split('.')
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part)))
    return false

  const octets = parts.map(Number)
  if (octets.some((octet) => octet < 0 || octet > 255)) return true

  const [a, b] = octets
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

function isPrivateIpv6(hostname: string) {
  const normalized = stripIpv6Brackets(hostname).toLowerCase()
  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith('::ffff:127.') ||
    normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:192.168.') ||
    /^::ffff:172\.(1[6-9]|2\d|3[01])\./.test(normalized)
  )
}

function assertSafeRemoteUrl(value: string) {
  const url = new URL(value)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('仅支持 HTTP/HTTPS 图片')
  }
  if (url.username || url.password) {
    throw new Error('图片 URL 不能包含登录凭据')
  }

  const hostname = stripIpv6Brackets(url.hostname.toLowerCase())
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === 'metadata.google.internal' ||
    isPrivateIpv4(hostname) ||
    (hostname.includes(':') && isPrivateIpv6(hostname))
  ) {
    throw new Error('不允许访问本机或私有网络图片')
  }

  return url
}

function isSameSiteImage(url: URL, siteUrl?: string) {
  if (!siteUrl) return false
  try {
    return url.origin === new URL(siteUrl).origin
  } catch {
    return false
  }
}

function addCandidate(
  candidates: Map<string, RemoteImageCandidate>,
  rawValue: string,
  role: 'inline' | 'cover',
  siteUrl?: string,
) {
  const raw = rawValue.trim()
  if (!/^https?:\/\//i.test(raw)) return

  const decoded = decodeHtmlUrl(raw)
  let url: URL
  try {
    url = new URL(decoded)
  } catch {
    return
  }
  if (isSameSiteImage(url, siteUrl)) return

  const sourceUrl = url.toString()
  const existing = candidates.get(sourceUrl)
  if (existing) {
    existing.rawValues.add(raw)
    if (role === 'cover') existing.role = 'cover'
    return
  }

  candidates.set(sourceUrl, {
    sourceUrl,
    rawValues: new Set([raw]),
    role,
  })
}

function collectImageCandidates(input: {
  content?: string
  html?: string
  coverImage?: string | null
  siteUrl?: string
}) {
  const candidates = new Map<string, RemoteImageCandidate>()
  const scanInlineText = (text: string) => {
    const htmlPattern =
      /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi
    const markdownPattern =
      /!\[[^\]]*]\(\s*(?:<([^>]+)>|(https?:\/\/[^\s)]+))/gi
    const jsonPattern = /"src"\s*:\s*"(https?:\/\/[^"\\]+)"/gi

    for (const match of text.matchAll(htmlPattern)) {
      addCandidate(
        candidates,
        match[1] || match[2] || match[3] || '',
        'inline',
        input.siteUrl,
      )
    }
    for (const match of text.matchAll(markdownPattern)) {
      addCandidate(
        candidates,
        match[1] || match[2] || '',
        'inline',
        input.siteUrl,
      )
    }
    for (const match of text.matchAll(jsonPattern)) {
      addCandidate(candidates, match[1] || '', 'inline', input.siteUrl)
    }
  }

  if (input.content) scanInlineText(input.content)
  if (input.html) scanInlineText(input.html)
  if (input.coverImage)
    addCandidate(candidates, input.coverImage, 'cover', input.siteUrl)

  return [...candidates.values()]
}

async function hashRemoteUrl(url: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(url),
  )
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24)
}

function inferRemoteImageName(url: URL, contentType: string | null) {
  const pathName = decodeURIComponent(
    url.pathname.split('/').pop() || '',
  ).trim()
  const extension =
    contentType?.split('/')[1]?.replace('jpeg', 'jpg') || 'image'
  const fallback = `remote-image.${extension}`
  const candidate = pathName || fallback
  const safe = candidate.replace(/[\r\n"\\]+/g, '-').slice(0, 180)
  return safe || fallback
}

async function fetchRemoteImage(sourceUrl: string, fetchImpl: typeof fetch) {
  let currentUrl = assertSafeRemoteUrl(sourceUrl)

  for (
    let redirectCount = 0;
    redirectCount <= MAX_REDIRECTS;
    redirectCount += 1
  ) {
    const response = await fetchImpl(currentUrl.toString(), {
      headers: {
        Accept:
          'image/avif,image/webp,image/png,image/jpeg,image/gif;q=0.9,*/*;q=0.1',
        'User-Agent': 'QiaomuBlog-RemoteImage/1.0',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location)
        throw new Error(`图片重定向缺少 Location（HTTP ${response.status}）`)
      if (redirectCount === MAX_REDIRECTS) throw new Error('图片重定向次数过多')
      currentUrl = assertSafeRemoteUrl(new URL(location, currentUrl).toString())
      continue
    }

    if (!response.ok) throw new Error(`下载图片失败（HTTP ${response.status}）`)

    const contentType =
      response.headers
        .get('content-type')
        ?.split(';')[0]
        .trim()
        .toLowerCase() || ''
    if (!SAFE_IMAGE_TYPES.has(contentType)) {
      throw new Error(
        `远程资源不是受支持的图片（${contentType || '未知类型'}）`,
      )
    }

    const declaredSize = Number.parseInt(
      response.headers.get('content-length') || '',
      10,
    )
    if (
      Number.isFinite(declaredSize) &&
      declaredSize > MAX_REMOTE_IMAGE_BYTES
    ) {
      throw new Error('远程图片超过 15MB')
    }

    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > MAX_REMOTE_IMAGE_BYTES)
      throw new Error('远程图片超过 15MB')

    return {
      buffer,
      contentType,
      sizeBytes: buffer.byteLength,
      finalUrl: currentUrl,
    }
  }

  throw new Error('图片重定向次数过多')
}

async function localizeCandidate(
  candidate: RemoteImageCandidate,
  bucket: RemoteImageBucket,
  fetchImpl: typeof fetch,
): Promise<LocalizedRemoteImage> {
  assertSafeRemoteUrl(candidate.sourceUrl)
  const hash = await hashRemoteUrl(candidate.sourceUrl)
  const key = `image/remote/${hash}`
  const encodedKey = key.split('/').map(encodeURIComponent).join('/')
  const url = `/api/images/${encodedKey}`
  const existing = await bucket.get(key)

  if (existing) {
    return {
      sourceUrl: candidate.sourceUrl,
      url,
      key,
      mimeType: existing.httpMetadata?.contentType || null,
      sizeBytes: existing.size ?? null,
      alt:
        existing.customMetadata?.originalName ||
        inferRemoteImageName(new URL(candidate.sourceUrl), null),
      role: candidate.role,
      reused: true,
    }
  }

  const downloaded = await fetchRemoteImage(candidate.sourceUrl, fetchImpl)
  const originalName = inferRemoteImageName(
    downloaded.finalUrl,
    downloaded.contentType,
  )

  await bucket.put(key, downloaded.buffer, {
    httpMetadata: {
      contentType: downloaded.contentType,
      cacheControl: 'public, max-age=31536000, immutable',
    },
    customMetadata: {
      originalName,
      sourceHost: downloaded.finalUrl.hostname.slice(0, 180),
    },
  })

  return {
    sourceUrl: candidate.sourceUrl,
    url,
    key,
    mimeType: downloaded.contentType,
    sizeBytes: downloaded.sizeBytes,
    alt: originalName,
    role: candidate.role,
    reused: false,
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
) {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(items[index])
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  )
  return results
}

function replaceAllLiteral(
  text: string | undefined,
  replacements: Map<string, string>,
) {
  if (text === undefined) return undefined
  let result = text
  for (const [source, target] of replacements) {
    result = result.split(source).join(target)
  }
  return result
}

export async function localizeRemotePostImages(
  input: LocalizeRemotePostImagesInput,
): Promise<RemoteImageLocalizationResult> {
  const candidates = collectImageCandidates(input)
  const selected = candidates.slice(0, MAX_REMOTE_IMAGES)
  const failures: RemoteImageLocalizationFailure[] = candidates
    .slice(MAX_REMOTE_IMAGES)
    .map((candidate) => ({
      sourceUrl: candidate.sourceUrl,
      error: `单篇文章最多自动本地化 ${MAX_REMOTE_IMAGES} 张远程图片`,
    }))
  const replacements = new Map<string, string>()
  const assets: LocalizedRemoteImage[] = []

  if (input.bucket) {
    const outcomes = await mapWithConcurrency(
      selected,
      DOWNLOAD_CONCURRENCY,
      async (candidate) => {
        try {
          return {
            candidate,
            asset: await localizeCandidate(
              candidate,
              input.bucket!,
              input.fetchImpl || fetch,
            ),
          }
        } catch (error) {
          return {
            candidate,
            error:
              error instanceof Error ? error.message : '远程图片本地化失败',
          }
        }
      },
    )

    for (const outcome of outcomes) {
      if ('asset' in outcome && outcome.asset) {
        assets.push(outcome.asset)
        for (const rawValue of outcome.candidate.rawValues) {
          replacements.set(rawValue, outcome.asset.url)
        }
      } else {
        failures.push({
          sourceUrl: outcome.candidate.sourceUrl,
          error: outcome.error || '远程图片本地化失败',
        })
      }
    }
  } else {
    failures.push(
      ...selected.map((candidate) => ({
        sourceUrl: candidate.sourceUrl,
        error: '图片存储未配置，已保留远程链接',
      })),
    )
  }

  const replacementRecord = Object.fromEntries(replacements)
  const localized = assets.filter((asset) => !asset.reused).length
  const reused = assets.filter((asset) => asset.reused).length

  return {
    content: replaceAllLiteral(input.content, replacements),
    html: replaceAllLiteral(input.html, replacements),
    coverImage:
      input.coverImage === null
        ? null
        : replaceAllLiteral(input.coverImage, replacements),
    assets,
    report: {
      found: candidates.length,
      localized,
      reused,
      skipped: failures.length,
      failures,
      replacements: replacementRecord,
    },
  }
}

export async function recordLocalizedRemoteAssets(
  db: D1Database,
  assets: LocalizedRemoteImage[],
  target: { postId?: number | null; slug?: string | null },
) {
  for (const image of assets) {
    try {
      const asset = await upsertMediaAsset(db, {
        source: 'remote',
        r2Key: image.key,
        url: image.url,
        mimeType: image.mimeType,
        sizeBytes: image.sizeBytes,
        alt: image.alt,
      })
      await linkMediaAssetToArticle(db, {
        assetId: asset.id,
        postId: target.postId,
        slug: target.slug,
        role: image.role,
      })
    } catch (error) {
      console.warn('Remote image asset indexing failed:', error)
    }
  }
}

export function remoteImageResponse(report: RemoteImageLocalizationReport) {
  return report.found > 0 ? { remote_images: report } : {}
}
