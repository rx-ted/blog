import type { NextRequest } from 'next/server'
import {
  ensureAuthenticatedRequest,
  getRouteEnvWithDb,
  jsonError,
  jsonOk,
} from '@/lib/server/route-helpers'
import {
  resolveUnsplashAccessKey,
  searchUnsplashPhotos,
  trackUnsplashDownload,
} from '@/lib/unsplash'

export async function GET(req: NextRequest) {
  const route = await getRouteEnvWithDb('No DB')
  if (!route.ok) return route.response

  const unauthorized = await ensureAuthenticatedRequest(req, route.db)
  if (unauthorized) return unauthorized

  try {
    const { accessKey } = await resolveUnsplashAccessKey(
      route.db,
      route.env as Record<string, unknown>,
    )
    if (!accessKey) {
      return jsonError('Unsplash API Key 未配置', 400)
    }

    const action = req.nextUrl.searchParams.get('action') || 'search'
    if (action === 'download') {
      const downloadLocation =
        req.nextUrl.searchParams.get('downloadLocation') || ''
      await trackUnsplashDownload(accessKey, downloadLocation)
      return jsonOk({ success: true })
    }

    const query = req.nextUrl.searchParams.get('q') || ''
    if (!query.trim()) {
      return jsonError('请输入搜索关键词', 400)
    }

    const page = Number(req.nextUrl.searchParams.get('page') || '1')
    const perPage = Number(req.nextUrl.searchParams.get('per_page') || '12')
    const result = await searchUnsplashPhotos({
      accessKey,
      query,
      page,
      perPage,
    })

    return jsonOk(result)
  } catch (error) {
    console.error('Unsplash editor route error:', error)
    return jsonError(
      error instanceof Error ? error.message : 'Unsplash 请求失败',
      500,
    )
  }
}
