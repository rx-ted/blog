import type { NextRequest } from 'next/server'
import {
  ensureAuthenticatedRequest,
  getRouteEnvWithDb,
  jsonError,
  jsonOk,
  parseJsonBody,
} from '@/lib/server/route-helpers'
import {
  getMediaAssetByUrl,
  linkMediaAssetToArticle,
  listMediaAssets,
} from '@/lib/repositories/media-assets'

function parsePositiveInteger(value: unknown) {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function GET(req: NextRequest) {
  const route = await getRouteEnvWithDb()
  if (!route.ok) return route.response

  const unauthorized = await ensureAuthenticatedRequest(req, route.db)
  if (unauthorized) return unauthorized

  const searchParams = req.nextUrl.searchParams
  const scope = searchParams.get('scope') === 'article' ? 'article' : 'all'
  const assets = await listMediaAssets(route.db, {
    scope,
    postId: parsePositiveInteger(searchParams.get('postId')),
    slug: searchParams.get('slug'),
    source: searchParams.get('source'),
    query: searchParams.get('q'),
    limit: parsePositiveInteger(searchParams.get('limit')) || 48,
    offset: Math.max(parsePositiveInteger(searchParams.get('offset')) || 0, 0),
  })

  return jsonOk({ assets })
}

export async function POST(req: NextRequest) {
  const route = await getRouteEnvWithDb()
  if (!route.ok) return route.response

  const unauthorized = await ensureAuthenticatedRequest(req, route.db)
  if (unauthorized) return unauthorized

  let body: {
    assetId?: number
    url?: string
    postId?: number | null
    slug?: string | null
    role?: 'inline' | 'cover' | 'section'
  }
  try {
    body = await parseJsonBody<typeof body>(req)
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : '请求体不是有效 JSON',
      400,
    )
  }

  let assetId = parsePositiveInteger(body.assetId)
  if (!assetId && body.url) {
    const asset = await getMediaAssetByUrl(route.db, body.url)
    assetId = asset?.id ?? null
  }
  if (!assetId) return jsonError('缺少有效的 assetId', 400)

  await linkMediaAssetToArticle(route.db, {
    assetId,
    postId: body.postId,
    slug: body.slug,
    role: body.role || 'inline',
  })

  return jsonOk({ success: true })
}
