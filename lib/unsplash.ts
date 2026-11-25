import type { OpenImageLibraryItem } from '@/lib/collage'
import { getSetting, setSetting } from '@/lib/db'
import {
  decryptApiKey,
  encryptApiKey,
  maskApiKey,
  resolveAiConfigSecret,
} from '@/lib/ai-provider-profiles'

export const UNSPLASH_ACCESS_KEY_SETTING = 'unsplash_access_key_encrypted'

const UNSPLASH_API_BASE = 'https://api.unsplash.com'
const MAX_UNSPLASH_PER_PAGE = 30

export type UnsplashConfigSource = 'env' | 'settings' | 'none'

export type UnsplashPhoto = {
  id: string
  alt_description?: string | null
  description?: string | null
  urls?: {
    regular?: string
    small?: string
    thumb?: string
  }
  links?: {
    html?: string
    download_location?: string
  }
  user?: {
    name?: string
    username?: string
    links?: {
      html?: string
    }
  }
}

export type UnsplashSearchResponse = {
  total?: number
  total_pages?: number
  results?: UnsplashPhoto[]
}

export function getEnvUnsplashAccessKey(env?: Record<string, unknown>) {
  const envKey =
    typeof env?.UNSPLASH_ACCESS_KEY === 'string'
      ? env.UNSPLASH_ACCESS_KEY
      : process.env.UNSPLASH_ACCESS_KEY
  return (envKey || '').trim()
}

export async function resolveUnsplashAccessKey(
  db: D1Database,
  env?: Record<string, unknown>,
): Promise<{ accessKey: string; source: UnsplashConfigSource }> {
  const envKey = getEnvUnsplashAccessKey(env)
  if (envKey) {
    return { accessKey: envKey, source: 'env' }
  }

  const encrypted = await getSetting(db, UNSPLASH_ACCESS_KEY_SETTING)
  const secret = resolveAiConfigSecret(env)
  const accessKey = await decryptApiKey(encrypted || '', secret)
  return { accessKey, source: accessKey ? 'settings' : 'none' }
}

export async function saveUnsplashAccessKey(
  db: D1Database,
  accessKey: string,
  env?: Record<string, unknown>,
) {
  const trimmed = accessKey.trim()
  const secret = resolveAiConfigSecret(env)
  const encrypted = trimmed ? await encryptApiKey(trimmed, secret) : ''
  await setSetting(db, UNSPLASH_ACCESS_KEY_SETTING, encrypted)
  return maskApiKey(trimmed)
}

export function maskUnsplashAccessKey(accessKey: string) {
  return maskApiKey(accessKey)
}

function clampPerPage(value: number) {
  if (!Number.isFinite(value)) return 12
  return Math.max(1, Math.min(MAX_UNSPLASH_PER_PAGE, Math.floor(value)))
}

function clampPage(value: number) {
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.floor(value))
}

export function mapUnsplashPhotoToLibraryItem(
  photo: UnsplashPhoto,
): OpenImageLibraryItem | null {
  const src = photo.urls?.regular || ''
  const thumbnail = photo.urls?.small || photo.urls?.thumb || src
  if (!photo.id || !src || !thumbnail) return null

  const photographer = photo.user?.name || photo.user?.username || 'Unsplash'
  const title = (
    photo.alt_description ||
    photo.description ||
    'Unsplash 图片'
  ).trim()

  return {
    id: `unsplash-${photo.id}`,
    title,
    category: 'Unsplash',
    src,
    thumbnail,
    source: photographer,
    downloadLocation: photo.links?.download_location || '',
    link: photo.links?.html || photo.user?.links?.html || '',
  }
}

export async function searchUnsplashPhotos({
  accessKey,
  query,
  page,
  perPage,
}: {
  accessKey: string
  query: string
  page?: number
  perPage?: number
}) {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    throw new Error('请输入搜索关键词')
  }
  if (!accessKey.trim()) {
    throw new Error('Unsplash API Key 未配置')
  }

  const url = new URL('/search/photos', UNSPLASH_API_BASE)
  url.searchParams.set('query', trimmedQuery)
  url.searchParams.set('page', String(clampPage(Number(page))))
  url.searchParams.set('per_page', String(clampPerPage(Number(perPage))))
  url.searchParams.set('content_filter', 'high')

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Client-ID ${accessKey.trim()}`,
      'Accept-Version': 'v1',
    },
    signal: AbortSignal.timeout(15000),
  })

  const rawBody = await response.text().catch(() => '')
  if (!response.ok) {
    throw new Error(
      parseUnsplashError(response.status, response.statusText, rawBody),
    )
  }

  const parsed = rawBody ? (JSON.parse(rawBody) as UnsplashSearchResponse) : {}
  const items = (parsed.results || [])
    .map(mapUnsplashPhotoToLibraryItem)
    .filter((item): item is OpenImageLibraryItem => Boolean(item))

  return {
    total: parsed.total || 0,
    totalPages: parsed.total_pages || 0,
    page: clampPage(Number(page)),
    items,
  }
}

export function isValidUnsplashDownloadLocation(input: string) {
  try {
    const url = new URL(input)
    return (
      url.protocol === 'https:' &&
      url.hostname === 'api.unsplash.com' &&
      /^\/photos\/[^/]+\/download$/.test(url.pathname)
    )
  } catch {
    return false
  }
}

export async function trackUnsplashDownload(
  accessKey: string,
  downloadLocation: string,
) {
  const normalizedLocation = downloadLocation.trim()
  if (!isValidUnsplashDownloadLocation(normalizedLocation)) {
    throw new Error('无效的 Unsplash 下载统计地址')
  }
  if (!accessKey.trim()) {
    throw new Error('Unsplash API Key 未配置')
  }

  const response = await fetch(normalizedLocation, {
    headers: {
      Authorization: `Client-ID ${accessKey.trim()}`,
      'Accept-Version': 'v1',
    },
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    const rawBody = await response.text().catch(() => '')
    throw new Error(
      parseUnsplashError(response.status, response.statusText, rawBody),
    )
  }
}

function parseUnsplashError(
  status: number,
  statusText: string,
  rawBody: string,
) {
  try {
    const parsed = rawBody
      ? (JSON.parse(rawBody) as { errors?: string[]; error?: string })
      : null
    if (Array.isArray(parsed?.errors) && parsed.errors.length > 0) {
      return parsed.errors.join(', ')
    }
    if (typeof parsed?.error === 'string' && parsed.error.trim()) {
      return parsed.error.trim()
    }
  } catch {
    // Fall through to plain text.
  }

  const trimmed = rawBody.trim()
  if (trimmed) return trimmed.slice(0, 300)
  return `Unsplash 请求失败：HTTP ${status} ${statusText}`
}
