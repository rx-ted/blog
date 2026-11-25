import type { NextRequest } from 'next/server'
import {
  ensureAuthenticatedRequest,
  getRouteEnvWithDb,
  jsonError,
  jsonOk,
  parseJsonBody,
} from '@/lib/server/route-helpers'
import {
  maskUnsplashAccessKey,
  resolveUnsplashAccessKey,
  saveUnsplashAccessKey,
} from '@/lib/unsplash'

export async function GET(req: NextRequest) {
  const route = await getRouteEnvWithDb('No DB')
  if (!route.ok) return route.response

  const unauthorized = await ensureAuthenticatedRequest(req, route.db)
  if (unauthorized) return unauthorized

  try {
    const config = await resolveUnsplashAccessKey(
      route.db,
      route.env as Record<string, unknown>,
    )
    return jsonOk({
      enabled: Boolean(config.accessKey),
      source: config.source,
      api_key_masked: maskUnsplashAccessKey(config.accessKey),
    })
  } catch (error) {
    console.error('Get Unsplash config error:', error)
    return jsonError(
      error instanceof Error ? error.message : '获取 Unsplash 配置失败',
      500,
    )
  }
}

export async function POST(req: NextRequest) {
  const route = await getRouteEnvWithDb('No DB')
  if (!route.ok) return route.response

  const unauthorized = await ensureAuthenticatedRequest(req, route.db)
  if (unauthorized) return unauthorized

  try {
    const body = await parseJsonBody<{ accessKey?: string; clear?: boolean }>(
      req,
    )
    const accessKey =
      typeof body.accessKey === 'string' ? body.accessKey.trim() : ''

    if (!accessKey && !body.clear) {
      return jsonError('Missing accessKey', 400)
    }

    const masked = await saveUnsplashAccessKey(
      route.db,
      body.clear ? '' : accessKey,
      route.env as Record<string, unknown>,
    )

    const config = await resolveUnsplashAccessKey(
      route.db,
      route.env as Record<string, unknown>,
    )
    return jsonOk({
      success: true,
      enabled: Boolean(config.accessKey),
      source: config.source,
      api_key_masked: body.clear ? '' : masked,
    })
  } catch (error) {
    console.error('Save Unsplash config error:', error)
    return jsonError(
      error instanceof Error ? error.message : '保存 Unsplash 配置失败',
      500,
    )
  }
}
