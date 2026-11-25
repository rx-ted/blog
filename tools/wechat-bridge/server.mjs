import http from 'node:http'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'
import dns from 'node:dns/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const HOST = process.env.HOST || '0.0.0.0'
const PORT = Number(process.env.PORT || 8788)
const BRIDGE_TOKEN = (process.env.BRIDGE_TOKEN || '').trim()
const ACCOUNTS_FILE =
  process.env.WECHAT_ACCOUNTS_FILE || '/etc/qmblog-wechat-bridge/accounts.json'
const REQUEST_BODY_LIMIT = 2.5 * 1024 * 1024
const REMOTE_IMAGE_LIMIT = 1024 * 1024
const COVER_IMAGE_LIMIT = 1024 * 1024
const COVER_THUMB_IMAGE_LIMIT = 64 * 1024
const FALLBACK_SOURCE_IMAGE_LIMIT = 20 * 1024 * 1024
const FALLBACK_SOURCE_COVER_LIMIT = 10 * 1024 * 1024
const WECHAT_DRAFT_TITLE_MAX_CHARS = 64
const WECHAT_DRAFT_AUTHOR_MAX_CHARS = 16
const WECHAT_DRAFT_DIGEST_MAX_CHARS = 128
const WECHAT_DRAFT_DIGEST_MAX_BYTES = 120
const WECHAT_ACCESS_TOKEN_ERROR_CODES = new Set([40001, 40014, 42001])
export const WECHAT_ARTICLE_IMAGE_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/gif',
])
const IMAGE_MAGICK_CONVERT_TIMEOUT_MS = readPositiveIntegerEnv(
  'WECHAT_IMAGE_CONVERT_TIMEOUT_MS',
  60_000,
)
const IMAGE_MAGICK_INSPECT_TIMEOUT_MS = readPositiveIntegerEnv(
  'WECHAT_IMAGE_INSPECT_TIMEOUT_MS',
  10_000,
)
// Official draft/add docs still say 32 chars, but the live API accepts 64
// and rejects 65 with errcode 45003. Verified on 2026-06-16.
const WECHAT_DRAFT_TITLE_LIMIT_HINT =
  '微信草稿 add API 实测支持 64 个字符，65 个字符会返回 45003；官方文档仍写 32，发布前以实测接口边界为准。'
const convertFile = promisify(execFile)
const IMAGE_MAGICK_BIN = process.env.IMAGEMAGICK_CONVERT || 'convert'
const IS_MAIN_MODULE = Boolean(
  process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url),
)

function readPositiveIntegerEnv(name, fallback) {
  const value = Number(process.env[name])
  return Number.isInteger(value) && value > 0 ? value : fallback
}

class RemoteFileTooLargeError extends Error {
  constructor(maxBytes, url, contentType = '') {
    super(`Remote file exceeds limit of ${maxBytes} bytes`)
    this.name = 'RemoteFileTooLargeError'
    this.maxBytes = maxBytes
    this.url = url
    this.contentType = contentType
  }
}

if (IS_MAIN_MODULE && !BRIDGE_TOKEN) {
  throw new Error('Missing BRIDGE_TOKEN')
}

const tokenCache = new Map()

function json(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

function toErrorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

function formatByteLimit(maxBytes) {
  if (maxBytes >= 1024 * 1024 && maxBytes % (1024 * 1024) === 0) {
    return `${maxBytes / (1024 * 1024)}MB`
  }

  if (maxBytes >= 1024 && maxBytes % 1024 === 0) {
    return `${maxBytes / 1024}KB`
  }

  return `${maxBytes} bytes`
}

function buildWxErrorMessage(payload, fallback, apiPath) {
  const message = String(payload?.errmsg || '').trim() || fallback
  const errcode =
    typeof payload?.errcode === 'number' ? ` errcode=${payload.errcode}` : ''
  const hint = explainWxError(payload)
  const raw = `${message}${errcode} path=${apiPath}`
  return hint ? `${hint}（${raw}）` : raw
}

function explainWxError(payload) {
  switch (Number(payload?.errcode)) {
    case 40001:
    case 40014:
    case 42001:
      return '微信公众号 access_token 刷新后仍不可用，请检查 AppID、AppSecret 和公众号后台调用来源'
    case 45002:
      return '微信公众号正文内容超出限制，请减少正文长度或图片数量后重试'
    case 45003:
      return `微信草稿 API 标题超出限制，请把标题控制在 ${WECHAT_DRAFT_TITLE_MAX_CHARS} 个字以内后重试。${WECHAT_DRAFT_TITLE_LIMIT_HINT}`
    case 45004:
      return '微信公众号摘要/描述超出限制，请把摘要控制在 120 bytes 以内后重试'
    case 45005:
      return '微信公众号原文链接超出限制或格式不正确，请检查原文链接后重试'
    default:
      return ''
  }
}

function truncateWechatText(input, maxChars, maxBytes = Infinity) {
  const normalized = String(input || '').trim()
  if (!normalized) return ''

  let output = ''
  let byteLength = 0
  let charLength = 0

  for (const char of normalized) {
    const nextByteLength = Buffer.byteLength(char, 'utf8')
    if (charLength >= maxChars || byteLength + nextByteLength > maxBytes) {
      break
    }
    output += char
    byteLength += nextByteLength
    charLength += 1
  }

  return output
}

function isWechatTextOverCharLimit(input, maxChars) {
  return Array.from(String(input || '').trim()).length > maxChars
}

async function loadAccounts() {
  const raw = await readFile(ACCOUNTS_FILE, 'utf8')
  const parsed = JSON.parse(raw)
  const inputAccounts = Array.isArray(parsed?.accounts) ? parsed.accounts : []

  return inputAccounts
    .map((account) => ({
      id: String(account?.id || '').trim(),
      name: String(account?.name || '').trim(),
      appid: String(account?.appid || '').trim(),
      secret: String(account?.secret || '').trim(),
    }))
    .filter(
      (account) =>
        account.id && account.name && account.appid && account.secret,
    )
}

async function readJsonBody(req, maxBytes = REQUEST_BODY_LIMIT) {
  const chunks = []
  let size = 0

  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) {
      throw new Error('Request body too large')
    }
    chunks.push(chunk)
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim()
  return raw ? JSON.parse(raw) : {}
}

function requireAuth(req) {
  const header = req.headers.authorization || ''
  if (header === `Bearer ${BRIDGE_TOKEN}`) return true
  return false
}

async function getAccount(accountId) {
  const accounts = await loadAccounts()
  const account = accounts.find((item) => item.id === accountId)
  if (!account) {
    throw new Error(`Unknown account_id: ${accountId}`)
  }
  return { account }
}

export function isWechatAccessTokenError(payload) {
  return WECHAT_ACCESS_TOKEN_ERROR_CODES.has(Number(payload?.errcode))
}

export async function getAccessToken(account, { forceRefresh = false } = {}) {
  const cached = tokenCache.get(account.id)
  const now = Date.now()

  if (!forceRefresh && cached && cached.expiresAt > now + 60_000) {
    return cached.token
  }

  const response = await fetch(
    'https://api.weixin.qq.com/cgi-bin/stable_token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credential',
        appid: account.appid,
        secret: account.secret,
        force_refresh: forceRefresh,
      }),
      signal: AbortSignal.timeout(15_000),
    },
  )
  const payload = await response.json().catch(() => ({}))
  const accessToken = String(payload?.access_token || '').trim()

  if (!response.ok || payload?.errcode || !accessToken) {
    throw new Error(
      buildWxErrorMessage(
        payload,
        `stable access_token request failed: HTTP ${response.status}`,
        '/cgi-bin/stable_token',
      ),
    )
  }

  const expiresIn = Number(payload?.expires_in || 7200)
  tokenCache.set(account.id, {
    token: accessToken,
    expiresAt: now + expiresIn * 1000,
  })

  return accessToken
}

async function requestWithAccessTokenRetry(account, request) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const accessToken = await getAccessToken(account, {
      forceRefresh: attempt > 0,
    })
    const result = await request(accessToken)

    if (!isWechatAccessTokenError(result.payload) || attempt > 0) {
      return result
    }

    tokenCache.delete(account.id)
    console.warn(
      `[wechat-bridge] refreshing stable access token account=${account.id} errcode=${result.payload.errcode}`,
    )
  }

  throw new Error('WeChat access token retry exhausted')
}

export async function wxApiJson(account, path, { method = 'POST', body } = {}) {
  const { response, payload } = await requestWithAccessTokenRetry(
    account,
    async (accessToken) => {
      const url = new URL(`https://api.weixin.qq.com${path}`)
      url.searchParams.set('access_token', accessToken)

      const response = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(20_000),
      })

      return {
        response,
        payload: await response.json().catch(() => ({})),
      }
    },
  )

  if (
    !response.ok ||
    (typeof payload?.errcode === 'number' && payload.errcode !== 0)
  ) {
    throw new Error(
      buildWxErrorMessage(payload, `WeChat API request failed: ${path}`, path),
    )
  }

  return payload
}

export async function wxUploadForm(account, path, searchParams, formData) {
  const { response, payload } = await requestWithAccessTokenRetry(
    account,
    async (accessToken) => {
      const url = new URL(`https://api.weixin.qq.com${path}`)
      url.searchParams.set('access_token', accessToken)

      for (const [key, value] of Object.entries(searchParams || {})) {
        url.searchParams.set(key, value)
      }

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(30_000),
      })

      return {
        response,
        payload: await response.json().catch(() => ({})),
      }
    },
  )

  if (
    !response.ok ||
    (typeof payload?.errcode === 'number' && payload.errcode !== 0)
  ) {
    throw new Error(
      buildWxErrorMessage(payload, `WeChat upload failed: ${path}`, path),
    )
  }

  return payload
}

function isPrivateIPv4(ip) {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(Number.isNaN)) return true

  if (parts[0] === 10) return true
  if (parts[0] === 127) return true
  if (parts[0] === 0) return true
  if (parts[0] === 169 && parts[1] === 254) return true
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
  if (parts[0] === 192 && parts[1] === 168) return true
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true
  return false
}

function isPrivateIPv6(ip) {
  const normalized = ip.toLowerCase()
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:')
  )
}

async function assertPublicHostname(url) {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http/https image URLs are allowed')
  }

  const hostname = url.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.local')) {
    throw new Error('Localhost URLs are not allowed')
  }

  if (net.isIP(hostname)) {
    if (
      (net.isIPv4(hostname) && isPrivateIPv4(hostname)) ||
      (net.isIPv6(hostname) && isPrivateIPv6(hostname))
    ) {
      throw new Error('Private network image URLs are not allowed')
    }
    return
  }

  const records = await dns.lookup(hostname, { all: true })
  if (!records.length) {
    throw new Error(`Cannot resolve hostname: ${hostname}`)
  }

  for (const record of records) {
    if (
      (record.family === 4 && isPrivateIPv4(record.address)) ||
      (record.family === 6 && isPrivateIPv6(record.address))
    ) {
      throw new Error('Private network image URLs are not allowed')
    }
  }
}

async function readResponseBuffer(response, maxBytes) {
  const reader = response.body?.getReader()
  if (!reader) {
    return Buffer.from(await response.arrayBuffer())
  }

  const chunks = []
  let size = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > maxBytes) {
      await reader.cancel()
      throw new RemoteFileTooLargeError(maxBytes)
    }
    chunks.push(Buffer.from(value))
  }

  return Buffer.concat(chunks)
}

function inferFileName(url, fallback) {
  const pathname = new URL(url).pathname
  const lastSegment = pathname.split('/').filter(Boolean).pop() || fallback
  const safe = lastSegment.replace(/[^a-zA-Z0-9._-]+/g, '-')
  return safe || fallback
}

function decodeHtmlEntities(input) {
  return String(input || '')
    .replace(/&amp;/gi, '&')
    .replace(/&#38;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

export function describeImageSource(inputUrl) {
  try {
    return new URL(decodeHtmlEntities(inputUrl)).hostname || 'unknown'
  } catch {
    return 'unknown'
  }
}

function shouldAttemptLocalTranscode(error) {
  if (!(error instanceof Error)) return false
  return (
    error instanceof RemoteFileTooLargeError ||
    /超过微信\s*\d+(?:\.\d+)?\s*(?:MB|KB)\s*限制/i.test(error.message) ||
    /Unsupported image type/i.test(error.message)
  )
}

export function shouldPassThroughOversizedGif(kind, contentType) {
  return (
    kind === 'content' &&
    String(contentType || '').toLowerCase() === 'image/gif'
  )
}

function isOptimizableBlogImageUrl(url) {
  return url.pathname.startsWith('/api/images/')
}

function isAnimationCapableImage(contentType, inputUrl) {
  if (['image/gif', 'image/webp', 'image/avif'].includes(contentType)) {
    return true
  }

  try {
    return /\.(?:gif|webp|avif)$/i.test(new URL(inputUrl).pathname)
  } catch {
    return false
  }
}

function buildImageFetchCandidates(inputUrl, kind) {
  const input = new URL(decodeHtmlEntities(inputUrl))
  const candidates = [input.toString()]

  if (!isOptimizableBlogImageUrl(input)) {
    return candidates
  }

  const presets =
    kind === 'cover'
      ? [
          { w: '1280', h: '720', fit: 'cover', q: '92', format: 'jpeg' },
          { w: '1280', h: '720', fit: 'cover', q: '88', format: 'jpeg' },
          { w: '1280', h: '720', fit: 'cover', q: '84', format: 'jpeg' },
          { w: '1280', h: '720', fit: 'cover', q: '80', format: 'jpeg' },
          { w: '1280', h: '720', fit: 'cover', q: '76', format: 'jpeg' },
          { w: '1200', h: '675', fit: 'cover', q: '92', format: 'jpeg' },
          { w: '1200', h: '675', fit: 'cover', q: '86', format: 'jpeg' },
          { w: '1200', h: '675', fit: 'cover', q: '80', format: 'jpeg' },
          { w: '1080', h: '608', fit: 'cover', q: '90', format: 'jpeg' },
          { w: '1080', h: '608', fit: 'cover', q: '84', format: 'jpeg' },
          { w: '1080', h: '608', fit: 'cover', q: '78', format: 'jpeg' },
          { w: '960', h: '540', fit: 'cover', q: '90', format: 'jpeg' },
          { w: '960', h: '540', fit: 'cover', q: '84', format: 'jpeg' },
          { w: '960', h: '540', fit: 'cover', q: '78', format: 'jpeg' },
          { w: '960', h: '540', fit: 'cover', q: '72', format: 'jpeg' },
          { w: '800', h: '450', fit: 'cover', q: '88', format: 'jpeg' },
          { w: '800', h: '450', fit: 'cover', q: '82', format: 'jpeg' },
          { w: '800', h: '450', fit: 'cover', q: '76', format: 'jpeg' },
          { w: '640', h: '360', fit: 'cover', q: '86', format: 'jpeg' },
          { w: '640', h: '360', fit: 'cover', q: '78', format: 'jpeg' },
          { w: '640', h: '360', fit: 'cover', q: '70', format: 'jpeg' },
          { w: '560', h: '315', fit: 'cover', q: '84', format: 'jpeg' },
          { w: '560', h: '315', fit: 'cover', q: '76', format: 'jpeg' },
          { w: '560', h: '315', fit: 'cover', q: '68', format: 'jpeg' },
          { w: '480', h: '270', fit: 'cover', q: '82', format: 'jpeg' },
          { w: '480', h: '270', fit: 'cover', q: '74', format: 'jpeg' },
          { w: '480', h: '270', fit: 'cover', q: '66', format: 'jpeg' },
          { w: '400', h: '225', fit: 'cover', q: '80', format: 'jpeg' },
          { w: '400', h: '225', fit: 'cover', q: '70', format: 'jpeg' },
          { w: '320', h: '180', fit: 'cover', q: '74', format: 'jpeg' },
          { w: '320', h: '180', fit: 'cover', q: '64', format: 'jpeg' },
        ]
      : [
          { w: '1280', q: '82', format: 'jpeg' },
          { w: '1080', q: '76', format: 'jpeg' },
          { w: '960', q: '70', format: 'jpeg' },
          { w: '840', q: '64', format: 'jpeg' },
          { w: '720', q: '58', format: 'jpeg' },
          { w: '640', q: '52', format: 'jpeg' },
        ]

  for (const preset of presets) {
    const next = new URL(input.toString())
    for (const [key, value] of Object.entries(preset)) {
      next.searchParams.set(key, value)
    }
    const candidate = next.toString()
    if (!candidates.includes(candidate)) {
      candidates.push(candidate)
    }
  }

  return candidates
}

async function fetchRemoteImageOnce(inputUrl, maxBytes) {
  let url = new URL(decodeHtmlEntities(inputUrl))

  for (let redirectCount = 0; redirectCount < 4; redirectCount += 1) {
    await assertPublicHostname(url)

    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000),
      headers: { 'User-Agent': 'qmblog-wechat-bridge/1.0' },
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location)
        throw new Error('Redirect response without Location header')
      url = new URL(location, url)
      continue
    }

    if (!response.ok) {
      throw new Error(`Failed to download image: HTTP ${response.status}`)
    }

    const contentType = (response.headers.get('content-type') || '')
      .split(';')[0]
      .trim()
      .toLowerCase()
    const data = await readResponseBuffer(response, maxBytes).catch((error) => {
      if (error instanceof RemoteFileTooLargeError) {
        error.url = url.toString()
        error.contentType = contentType
      }
      throw error
    })

    return {
      buffer: data,
      contentType,
      url: url.toString(),
      fileName: inferFileName(url.toString(), 'image'),
    }
  }

  throw new Error('Too many redirects while downloading image')
}

async function fetchRemoteImage(inputUrl, maxBytes, kind, allowedTypes = []) {
  const candidates = buildImageFetchCandidates(inputUrl, kind)
  let lastTooLargeError = null
  let lastUnsupportedType = ''

  for (const [candidateIndex, candidate] of candidates.entries()) {
    try {
      const download = await fetchRemoteImageOnce(candidate, maxBytes)
      if (allowedTypes.length && !allowedTypes.includes(download.contentType)) {
        if (
          candidateIndex === 0 &&
          kind === 'content' &&
          isAnimationCapableImage(download.contentType, candidate)
        ) {
          throw new Error(
            `Unsupported image type: ${download.contentType || 'unknown'}`,
          )
        }
        lastUnsupportedType = download.contentType || 'unknown'
        continue
      }
      return download
    } catch (error) {
      if (error instanceof RemoteFileTooLargeError) {
        if (
          candidateIndex === 0 &&
          kind === 'content' &&
          isAnimationCapableImage(error.contentType, candidate)
        ) {
          throw error
        }
        lastTooLargeError = error
        continue
      }
      throw error
    }
  }

  if (lastTooLargeError) {
    const limitLabel = formatByteLimit(maxBytes)
    throw new Error(
      `图片在自动压缩后仍超过微信 ${limitLabel} 限制（来源：${describeImageSource(lastTooLargeError.url || inputUrl)}）`,
    )
  }

  if (lastUnsupportedType) {
    throw new Error(`Unsupported image type: ${lastUnsupportedType}`)
  }

  throw new Error(
    `Failed to download image from ${describeImageSource(inputUrl)}`,
  )
}

export function normalizeImageFile(download, allowedTypes) {
  const extensionMap = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
  }

  if (!allowedTypes.includes(download.contentType)) {
    throw new Error(
      `Unsupported image type: ${download.contentType || 'unknown'}`,
    )
  }

  const extension = extensionMap[download.contentType] || 'img'
  const baseName = download.fileName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  const fileName = `${baseName}.${extension}`

  return {
    blob: new Blob([download.buffer], { type: download.contentType }),
    fileName,
    contentType: download.contentType,
  }
}

function buildLocalTranscodePresets(kind) {
  if (kind === 'cover') {
    return [
      { width: 1280, height: 720, quality: 92 },
      { width: 1280, height: 720, quality: 88 },
      { width: 1280, height: 720, quality: 84 },
      { width: 1280, height: 720, quality: 80 },
      { width: 1280, height: 720, quality: 76 },
      { width: 1200, height: 675, quality: 92 },
      { width: 1200, height: 675, quality: 86 },
      { width: 1200, height: 675, quality: 80 },
      { width: 1080, height: 608, quality: 90 },
      { width: 1080, height: 608, quality: 84 },
      { width: 1080, height: 608, quality: 78 },
      { width: 960, height: 540, quality: 90 },
      { width: 960, height: 540, quality: 84 },
      { width: 960, height: 540, quality: 78 },
      { width: 960, height: 540, quality: 72 },
      { width: 800, height: 450, quality: 88 },
      { width: 800, height: 450, quality: 82 },
      { width: 800, height: 450, quality: 76 },
      { width: 640, height: 360, quality: 86 },
      { width: 640, height: 360, quality: 78 },
      { width: 640, height: 360, quality: 70 },
      { width: 560, height: 315, quality: 84 },
      { width: 560, height: 315, quality: 76 },
      { width: 560, height: 315, quality: 68 },
      { width: 480, height: 270, quality: 82 },
      { width: 480, height: 270, quality: 74 },
      { width: 480, height: 270, quality: 66 },
      { width: 400, height: 225, quality: 80 },
      { width: 400, height: 225, quality: 70 },
      { width: 320, height: 180, quality: 74 },
      { width: 320, height: 180, quality: 64 },
    ]
  }

  return [
    { width: 1280, quality: 82 },
    { width: 1080, quality: 76 },
    { width: 960, quality: 70 },
    { width: 840, quality: 64 },
    { width: 720, quality: 58 },
    { width: 640, quality: 52 },
    { width: 560, quality: 46 },
    { width: 480, quality: 40 },
    { width: 420, quality: 36 },
    { width: 360, quality: 32 },
    { width: 320, quality: 28 },
    { width: 280, quality: 24 },
  ]
}

export function pickAnimatedGifTranscodePreset(sourceBytes) {
  if (sourceBytes >= 6 * 1024 * 1024) {
    return { width: 240, colors: 24 }
  }

  if (sourceBytes >= 3 * 1024 * 1024) {
    return { width: 480, colors: 64 }
  }

  return { width: 560, colors: 80 }
}

function isMissingFileError(error) {
  return Boolean(error && typeof error === 'object' && error.code === 'ENOENT')
}

function summarizeProcessOutput(stdout, stderr) {
  const output = [stderr, stdout]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join('\n')
    .replace(/\s+/g, ' ')

  return output ? ` output=${output.slice(0, 500)}` : ''
}

function describeTranscodePreset(kind, preset) {
  if ('colors' in preset) {
    return `${preset.width}x> colors=${preset.colors}`
  }

  const size =
    kind === 'cover' ? `${preset.width}x${preset.height}` : `${preset.width}x>`
  return `${size} q=${preset.quality}`
}

function describeExecError(error) {
  if (!error || typeof error !== 'object') return String(error)

  const code = error.code ? ` code=${error.code}` : ''
  const signal = error.signal ? ` signal=${error.signal}` : ''
  const message = error.message ? ` ${error.message}` : ''
  return `${message}${code}${signal}${summarizeProcessOutput(error.stdout, error.stderr)}`.trim()
}

function isExecTimeoutError(error) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      (error.killed === true || error.code === 'ETIMEDOUT'),
  )
}

async function runImageMagickConvert(
  args,
  outputPath,
  context,
  format = 'jpeg',
) {
  const outputTargets = [`${format}:${outputPath}`, outputPath]
  let lastMissingOutput = null

  for (const outputTarget of outputTargets) {
    await rm(outputPath, { force: true }).catch(() => {})

    let result
    try {
      result = await convertFile(IMAGE_MAGICK_BIN, [...args, outputTarget], {
        timeout: IMAGE_MAGICK_CONVERT_TIMEOUT_MS,
        killSignal: 'SIGKILL',
        maxBuffer: 1024 * 1024,
      })
    } catch (error) {
      if (isExecTimeoutError(error)) {
        const seconds = Math.ceil(IMAGE_MAGICK_CONVERT_TIMEOUT_MS / 1000)
        const imageKind = format === 'gif' ? '动图' : '图片'
        throw new Error(
          `${imageKind}转换超过 ${seconds} 秒，已停止处理以避免发布超时。请先把这张图片压缩到 1MB 以内后重试。`,
        )
      }
      throw new Error(
        `ImageMagick 图片转换失败（${context}）：${describeExecError(error)}`,
      )
    }

    try {
      const outputBuffer = await readFile(outputPath)
      if (outputBuffer.byteLength === 0) {
        lastMissingOutput = new Error(
          `ImageMagick 图片转换生成了空文件（${context}）。${summarizeProcessOutput(result?.stdout, result?.stderr)}`,
        )
        continue
      }
      return outputBuffer
    } catch (error) {
      if (!isMissingFileError(error)) throw error
      lastMissingOutput = new Error(
        `ImageMagick 图片转换没有生成输出文件（${context}）。${summarizeProcessOutput(result?.stdout, result?.stderr)}`,
      )
    }
  }

  throw (
    lastMissingOutput ||
    new Error(`ImageMagick 图片转换没有生成输出文件（${context}）。`)
  )
}

async function getImageFrameCount(inputPath) {
  try {
    const result = await convertFile(
      IMAGE_MAGICK_BIN,
      [inputPath, '-format', '%n\n', 'info:'],
      {
        timeout: IMAGE_MAGICK_INSPECT_TIMEOUT_MS,
        killSignal: 'SIGKILL',
        maxBuffer: 1024 * 1024,
      },
    )
    const frameCounts = String(result?.stdout || '')
      .split(/\s+/)
      .map(Number)
      .filter((value) => Number.isInteger(value) && value > 0)

    return frameCounts.length ? Math.max(...frameCounts) : 1
  } catch (error) {
    if (isExecTimeoutError(error)) {
      throw new Error('读取动图信息超时，请先把这张动图压缩到 1MB 以内后重试。')
    }
    throw new Error(`ImageMagick 无法读取图片帧数：${describeExecError(error)}`)
  }
}

export async function transcodeImageLocally(download, { kind, maxBytes }) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'qmblog-wechat-bridge-'))
  const inputPath = path.join(tempDir, 'input.bin')

  try {
    await writeFile(inputPath, download.buffer)

    const frameCount =
      kind === 'content' ? await getImageFrameCount(inputPath) : 1
    const isAnimated = kind === 'content' && frameCount > 1
    const outputPath = path.join(
      tempDir,
      isAnimated ? 'output.gif' : 'output.jpg',
    )
    const presets = isAnimated
      ? [pickAnimatedGifTranscodePreset(download.buffer.byteLength)]
      : buildLocalTranscodePresets(kind)

    for (const preset of presets) {
      const resizeArgs = isAnimated
        ? [
            '-coalesce',
            '-thumbnail',
            `${preset.width}x>`,
            '-colors',
            String(preset.colors),
            '-layers',
            'Optimize',
          ]
        : kind === 'cover'
          ? [
              '-thumbnail',
              `${preset.width}x${preset.height}^`,
              '-gravity',
              'center',
              '-extent',
              `${preset.width}x${preset.height}`,
            ]
          : ['-thumbnail', `${preset.width}x>`]

      const context = `${kind} ${describeTranscodePreset(kind, preset)}`
      const outputBuffer = await runImageMagickConvert(
        [
          isAnimated ? inputPath : `${inputPath}[0]`,
          '-auto-orient',
          '-strip',
          ...resizeArgs,
          ...(isAnimated
            ? []
            : [
                '-interlace',
                'Plane',
                '-sampling-factor',
                '4:2:0',
                '-quality',
                String(preset.quality),
              ]),
        ],
        outputPath,
        context,
        isAnimated ? 'gif' : 'jpeg',
      )

      if (outputBuffer.byteLength <= maxBytes) {
        const baseName =
          download.fileName.replace(/\.[a-z0-9]+$/i, '') || 'image'
        return {
          blob: new Blob([outputBuffer], {
            type: isAnimated ? 'image/gif' : 'image/jpeg',
          }),
          fileName: `${baseName}.${isAnimated ? 'gif' : 'jpg'}`,
          contentType: isAnimated ? 'image/gif' : 'image/jpeg',
        }
      }
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }

  const limitLabel = formatByteLimit(maxBytes)
  throw new Error(
    `图片在本地重压后仍超过微信 ${limitLabel} 限制（来源：${describeImageSource(download.url)}）`,
  )
}

export async function buildWechatUploadFile(sourceUrl, options) {
  try {
    const optimized = await fetchRemoteImage(
      sourceUrl,
      options.maxBytes,
      options.kind,
      options.allowedTypes,
    )
    return normalizeImageFile(optimized, options.allowedTypes)
  } catch (error) {
    if (
      error instanceof RemoteFileTooLargeError &&
      shouldPassThroughOversizedGif(options.kind, error.contentType)
    ) {
      const originalGif = await fetchRemoteImageOnce(
        decodeHtmlEntities(sourceUrl),
        options.fallbackSourceLimit,
      )
      return normalizeImageFile(originalGif, options.allowedTypes)
    }

    if (!shouldAttemptLocalTranscode(error)) {
      throw error
    }

    const original = await fetchRemoteImageOnce(
      decodeHtmlEntities(sourceUrl),
      options.fallbackSourceLimit,
    )
    return transcodeImageLocally(original, {
      kind: options.kind,
      maxBytes: options.maxBytes,
    })
  }
}

async function uploadArticleImage(account, sourceUrl) {
  const normalized = await buildWechatUploadFile(sourceUrl, {
    kind: 'content',
    maxBytes: REMOTE_IMAGE_LIMIT,
    allowedTypes: WECHAT_ARTICLE_IMAGE_TYPES,
    fallbackSourceLimit: FALLBACK_SOURCE_IMAGE_LIMIT,
  })
  const formData = new FormData()
  formData.append('media', normalized.blob, normalized.fileName)

  const payload = await wxUploadForm(
    account,
    '/cgi-bin/media/uploadimg',
    {},
    formData,
  )
  const resultUrl = String(payload?.url || '').trim()
  if (!resultUrl) {
    throw new Error('WeChat uploadimg did not return url')
  }
  return resultUrl
}

async function uploadCoverMaterial(
  account,
  sourceUrl,
  { materialType, maxBytes },
) {
  const normalized = await buildWechatUploadFile(sourceUrl, {
    kind: 'cover',
    maxBytes,
    allowedTypes: ['image/jpeg'],
    fallbackSourceLimit: FALLBACK_SOURCE_COVER_LIMIT,
  })
  const formData = new FormData()
  formData.append(
    'media',
    normalized.blob,
    normalized.fileName.endsWith('.jpg') ? normalized.fileName : 'cover.jpg',
  )

  const payload = await wxUploadForm(
    account,
    '/cgi-bin/material/add_material',
    { type: materialType },
    formData,
  )
  const mediaId = String(payload?.media_id || '').trim()
  if (!mediaId) {
    throw new Error('WeChat add_material did not return media_id')
  }
  return {
    mediaId,
    materialType,
    maxBytes,
  }
}

async function uploadCoverImageMaterial(account, sourceUrl) {
  return uploadCoverMaterial(account, sourceUrl, {
    materialType: 'image',
    maxBytes: COVER_IMAGE_LIMIT,
  })
}

async function uploadCoverThumb(account, sourceUrl) {
  return uploadCoverMaterial(account, sourceUrl, {
    materialType: 'thumb',
    maxBytes: COVER_THUMB_IMAGE_LIMIT,
  })
}

function shouldRetryCoverAsThumb(error) {
  const message = toErrorMessage(error).toLowerCase()
  return (
    message.includes('thumb_media_id') ||
    message.includes('invalid media_id') ||
    message.includes('invalid media id') ||
    message.includes('invalid media type') ||
    message.includes('invalid file type') ||
    message.includes('40007') ||
    message.includes('40005') ||
    message.includes('40009')
  )
}

async function replaceHtmlImageSources(html, replacer) {
  const regex = /<img\b[^>]*?\bsrc=(['"])(.*?)\1/gi
  let result = ''
  let lastIndex = 0

  for (let match = regex.exec(html); match !== null; match = regex.exec(html)) {
    const [fullMatch, quote, src] = match
    const start = match.index
    const end = start + fullMatch.length
    const newSrc = await replacer(src)
    const updatedTag = fullMatch.replace(
      `${quote}${src}${quote}`,
      `${quote}${newSrc}${quote}`,
    )

    result += html.slice(lastIndex, start)
    result += updatedTag
    lastIndex = end
  }

  result += html.slice(lastIndex)
  return result
}

function collectArticleImageAssets(html) {
  const regex = /<img\b[^>]*?\bsrc=(['"])(.*?)\1/gi
  const assets = []
  const bySource = new Map()

  for (let match = regex.exec(html); match !== null; match = regex.exec(html)) {
    const source = decodeHtmlEntities(match[2] || '').trim()

    if (!source || source.startsWith('data:')) {
      throw new Error('WeChat content does not support inline data URLs')
    }

    if (bySource.has(source)) continue

    const asset = {
      index: assets.length,
      kind: 'content',
      source,
      placeholder: `__QM_WECHAT_IMAGE_${assets.length}__`,
      publicUrl: '',
    }
    assets.push(asset)
    bySource.set(source, asset)
  }

  return assets
}

function insertAssetPlaceholders(html, assets) {
  const bySource = new Map(assets.map((asset) => [asset.source, asset]))

  return replaceHtmlImageSources(html, async (src) => {
    const source = decodeHtmlEntities(src).trim()
    const asset = bySource.get(source)
    return asset?.placeholder || src
  })
}

function replaceAssetPlaceholders(html, assets) {
  let result = html

  for (const asset of assets) {
    if (!asset.publicUrl) {
      throw new Error(`Missing uploaded image URL for asset #${asset.index}`)
    }
    result = result.split(asset.placeholder).join(asset.publicUrl)
  }

  return result
}

function extractFirstImageSource(html) {
  const match = html.match(/<img\b[^>]*?\bsrc=(['"])(.*?)\1/i)
  return decodeHtmlEntities(match?.[2] || '')
}

async function publishArticle(account, body) {
  const title = String(body?.title || '').trim()
  const contentHtml = String(body?.content_html || '').trim()
  const accountId = String(body?.account_id || '').trim()
  const publishNow = Boolean(body?.publish_now)

  if (!accountId) throw new Error('Missing account_id')
  if (!title) throw new Error('Missing title')
  if (isWechatTextOverCharLimit(title, WECHAT_DRAFT_TITLE_MAX_CHARS)) {
    throw new Error(
      `微信草稿 API 标题超出限制，请把标题控制在 ${WECHAT_DRAFT_TITLE_MAX_CHARS} 个字以内后重试。${WECHAT_DRAFT_TITLE_LIMIT_HINT}`,
    )
  }
  if (!contentHtml) throw new Error('Missing content_html')

  const imageAssets = collectArticleImageAssets(contentHtml)
  let rewrittenContent = await insertAssetPlaceholders(contentHtml, imageAssets)

  for (const asset of imageAssets) {
    asset.publicUrl = await uploadArticleImage(account, asset.source)
  }

  rewrittenContent = replaceAssetPlaceholders(rewrittenContent, imageAssets)

  const coverImageUrl =
    decodeHtmlEntities(String(body?.cover_image_url || '').trim()) ||
    extractFirstImageSource(contentHtml)
  if (!coverImageUrl) {
    throw new Error(
      'Missing cover_image_url and no image found in article content',
    )
  }

  const buildDraftBody = (thumbMediaId) => ({
    articles: [
      {
        title,
        author: truncateWechatText(body?.author, WECHAT_DRAFT_AUTHOR_MAX_CHARS),
        digest: truncateWechatText(
          body?.digest,
          WECHAT_DRAFT_DIGEST_MAX_CHARS,
          WECHAT_DRAFT_DIGEST_MAX_BYTES,
        ),
        content: rewrittenContent,
        content_source_url: String(body?.content_source_url || '').trim(),
        thumb_media_id: thumbMediaId,
        need_open_comment: body?.need_open_comment ? 1 : 0,
        only_fans_can_comment: body?.only_fans_can_comment ? 1 : 0,
      },
    ],
  })

  let coverUpload
  try {
    coverUpload = await uploadCoverImageMaterial(account, coverImageUrl)
  } catch (error) {
    if (!shouldRetryCoverAsThumb(error)) {
      throw error
    }
    coverUpload = await uploadCoverThumb(account, coverImageUrl)
  }

  let draftPayload
  try {
    draftPayload = await wxApiJson(account, '/cgi-bin/draft/add', {
      body: buildDraftBody(coverUpload.mediaId),
    })
  } catch (error) {
    if (
      coverUpload.materialType === 'thumb' ||
      !shouldRetryCoverAsThumb(error)
    ) {
      throw error
    }
    coverUpload = await uploadCoverThumb(account, coverImageUrl)
    draftPayload = await wxApiJson(account, '/cgi-bin/draft/add', {
      body: buildDraftBody(coverUpload.mediaId),
    })
  }

  const mediaId = String(draftPayload?.media_id || '').trim()
  if (!mediaId) {
    throw new Error('WeChat draft/add did not return media_id')
  }

  const response = {
    success: true,
    account: {
      id: account.id,
      name: account.name,
    },
    media_id: mediaId,
    publish_now: publishNow,
    assets: {
      image_count: imageAssets.length,
      uploaded_image_count: imageAssets.filter((asset) => asset.publicUrl)
        .length,
      cover_upload_type: coverUpload.materialType,
      cover_upload_limit: formatByteLimit(coverUpload.maxBytes),
    },
  }

  if (!publishNow) {
    return response
  }

  const publishPayload = await wxApiJson(
    account,
    '/cgi-bin/freepublish/submit',
    {
      body: { media_id: mediaId },
    },
  )

  return {
    ...response,
    publish_id: String(publishPayload?.publish_id || ''),
    msg_data_id: String(publishPayload?.msg_data_id || ''),
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const method = req.method || 'GET'
    const requestUrl = new URL(
      req.url || '/',
      `http://${req.headers.host || 'localhost'}`,
    )

    if (method === 'GET' && requestUrl.pathname === '/health') {
      const accounts = await loadAccounts().catch(() => [])
      return json(res, 200, {
        ok: true,
        service: 'qmblog-wechat-bridge',
        account_count: accounts.length,
      })
    }

    if (!requireAuth(req)) {
      return json(res, 401, { error: 'Unauthorized' })
    }

    if (method === 'GET' && requestUrl.pathname === '/v1/accounts') {
      const accounts = await loadAccounts()
      return json(res, 200, {
        accounts: accounts.map(({ id, name }) => ({ id, name })),
      })
    }

    if (method === 'POST' && requestUrl.pathname === '/v1/wechat/publish') {
      const body = await readJsonBody(req)
      const { account } = await getAccount(
        String(body?.account_id || '').trim(),
      )
      const result = await publishArticle(account, body)
      return json(res, 200, result)
    }

    return json(res, 404, { error: 'Not found' })
  } catch (error) {
    console.error('[wechat-bridge]', error)
    return json(res, 500, { error: toErrorMessage(error) })
  }
})

if (IS_MAIN_MODULE) {
  server.listen(PORT, HOST, () => {
    console.log(`qmblog-wechat-bridge listening on ${HOST}:${PORT}`)
  })
}
