import {
  deletePost,
  getPostById,
  getPostBySlug,
  rememberPostSlugAlias,
  updatePost,
} from '@/lib/db'
import { invalidatePublicContentCache } from '@/lib/cache'
import { buildAutoDescription, normalizePostSlug } from '@/lib/post-utils'
import { enqueueBackgroundJob } from '@/lib/background-jobs'
import {
  localizeRemotePostImages,
  recordLocalizedRemoteAssets,
  remoteImageResponse,
  type RemoteImageBucket,
} from '@/lib/remote-image-localization'
import {
  ensureAuthenticatedRequest,
  getRouteContextWithDb,
  jsonError,
  jsonOk,
  parseJsonBody,
} from '@/lib/server/route-helpers'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ slug: string }> }

type AdminPostPayload = {
  id?: unknown
  slug?: unknown
  title?: unknown
  content?: unknown
  html?: unknown
  category?: unknown
  status?: unknown
  password?: unknown
  is_pinned?: unknown
  is_hidden?: unknown
  cover_image?: unknown
  tags?: unknown
  description?: unknown
}

function normalizeTagsInput(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 10)
}

function isBinaryFlag(value: unknown): value is 0 | 1 {
  return value === 0 || value === 1
}

// 获取单篇文章（编辑用）
export async function GET(req: NextRequest, { params }: Ctx) {
  const { slug } = await params
  const route = await getRouteContextWithDb('DB not configured')
  if (!route.ok) return route.response

  const authError = await ensureAuthenticatedRequest(req, route.db)
  if (authError) return authError

  const post = await getPostBySlug(route.db, slug)
  if (!post) return jsonError('文章不存在', 404)

  return jsonOk(post)
}

// 更新文章
export async function PUT(req: NextRequest, { params }: Ctx) {
  const { slug } = await params
  const route = await getRouteContextWithDb('DB not configured')
  if (!route.ok) return route.response
  const { env, db, ctx } = route

  const authError = await ensureAuthenticatedRequest(req, db)
  if (authError) return authError

  try {
    const rawPayload = await parseJsonBody<AdminPostPayload>(req)
    const payloadId =
      typeof rawPayload.id === 'number' &&
      Number.isInteger(rawPayload.id) &&
      rawPayload.id > 0
        ? rawPayload.id
        : null
    const post = payloadId
      ? await getPostById(db, payloadId)
      : await getPostBySlug(db, slug)
    if (!post) return jsonError('文章不存在', 404)

    const localization = await localizeRemotePostImages({
      bucket: env.IMAGES as RemoteImageBucket | undefined,
      content:
        typeof rawPayload.content === 'string' ? rawPayload.content : undefined,
      html: typeof rawPayload.html === 'string' ? rawPayload.html : undefined,
      coverImage:
        typeof rawPayload.cover_image === 'string' ||
        rawPayload.cover_image === null
          ? rawPayload.cover_image
          : undefined,
      siteUrl:
        typeof env.NEXT_PUBLIC_SITE_URL === 'string'
          ? env.NEXT_PUBLIC_SITE_URL
          : undefined,
    })
    const payload: AdminPostPayload = {
      ...rawPayload,
      ...(typeof rawPayload.content === 'string'
        ? { content: localization.content }
        : {}),
      ...(typeof rawPayload.html === 'string'
        ? { html: localization.html }
        : {}),
      ...(typeof rawPayload.cover_image === 'string' ||
      rawPayload.cover_image === null
        ? { cover_image: localization.coverImage }
        : {}),
    }

    const updates: Parameters<typeof updatePost>[2] = {}

    if (payload.slug !== undefined) {
      if (typeof payload.slug !== 'string')
        return jsonError('slug 必须是字符串', 400)
      const nextSlug = normalizePostSlug(payload.slug)
      if (nextSlug) updates.slug = nextSlug
    }

    if (payload.title !== undefined) {
      if (typeof payload.title !== 'string')
        return jsonError('标题必须是字符串', 400)
      updates.title = payload.title.trim()
    }

    if (payload.content !== undefined) {
      if (typeof payload.content !== 'string')
        return jsonError('正文必须是字符串', 400)
      updates.content = payload.content
    }

    if (payload.html !== undefined) {
      if (typeof payload.html !== 'string')
        return jsonError('HTML 必须是字符串', 400)
      updates.html = payload.html
    }

    if (payload.category !== undefined) {
      if (payload.category !== null && typeof payload.category !== 'string') {
        return jsonError('分类必须是字符串', 400)
      }
      const category =
        typeof payload.category === 'string' ? payload.category.trim() : ''
      updates.category = category || '未分类'
    }

    if (payload.status !== undefined) {
      if (
        payload.status !== 'draft' &&
        payload.status !== 'published' &&
        payload.status !== 'deleted'
      ) {
        return jsonError('状态不合法', 400)
      }
      updates.status = payload.status
    }

    if (payload.password !== undefined) {
      if (payload.password !== null && typeof payload.password !== 'string') {
        return jsonError('密码必须是字符串', 400)
      }
      updates.password =
        typeof payload.password === 'string' && payload.password.trim()
          ? payload.password.trim()
          : null
    }

    if (payload.is_pinned !== undefined) {
      if (!isBinaryFlag(payload.is_pinned))
        return jsonError('is_pinned 必须是 0 或 1', 400)
      updates.is_pinned = payload.is_pinned
    }

    if (payload.is_hidden !== undefined) {
      if (!isBinaryFlag(payload.is_hidden))
        return jsonError('is_hidden 必须是 0 或 1', 400)
      updates.is_hidden = payload.is_hidden
    }

    if (payload.cover_image !== undefined) {
      if (
        payload.cover_image !== null &&
        typeof payload.cover_image !== 'string'
      ) {
        return jsonError('封面图必须是字符串', 400)
      }
      updates.cover_image =
        typeof payload.cover_image === 'string' && payload.cover_image.trim()
          ? payload.cover_image.trim()
          : null
    }

    if (payload.tags !== undefined) {
      if (!Array.isArray(payload.tags)) return jsonError('tags 必须是数组', 400)
      updates.tags = normalizeTagsInput(payload.tags)
    }

    if (payload.description !== undefined) {
      if (typeof payload.description !== 'string')
        return jsonError('摘要必须是字符串', 400)
      const sourceContent =
        typeof payload.content === 'string' ? payload.content : post.content
      updates.description =
        payload.description.trim() || buildAutoDescription(sourceContent)
    } else if (typeof payload.content === 'string') {
      updates.description = buildAutoDescription(payload.content)
    }

    if (Object.keys(updates).length === 0) {
      return jsonOk({ success: true, id: post.id, slug: post.slug })
    }

    await updatePost(db, post.id, updates)
    const persistedSlug =
      typeof updates.slug === 'string' ? updates.slug : post.slug
    await rememberPostSlugAlias(db, post.id, slug, persistedSlug)
    if (localization.assets.length > 0) {
      await recordLocalizedRemoteAssets(db, localization.assets, {
        postId: post.id,
        slug: persistedSlug,
      })
    }

    // 清除 KV 缓存（失败不影响保存结果）
    try {
      await invalidatePublicContentCache(env)
    } catch (cacheErr) {
      console.warn('Cache invalidation failed:', cacheErr)
    }

    await enqueueBackgroundJob(
      env,
      {
        type: 'sync-post-related-index',
        postId: post.id,
      },
      {
        waitUntil: ctx?.waitUntil?.bind(ctx),
      },
    )

    return jsonOk({
      success: true,
      id: post.id,
      slug: persistedSlug,
      ...remoteImageResponse(localization.report),
    })
  } catch (err) {
    if (
      err instanceof Error &&
      /UNIQUE constraint failed: posts\.slug/i.test(err.message)
    ) {
      return jsonError('slug 已存在，请换一个', 409)
    }
    console.error('PUT /api/admin/posts/[slug] error:', err)
    return jsonError(err instanceof Error ? err.message : '保存失败', 500)
  }
}

// 删除文章
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { slug } = await params
  const route = await getRouteContextWithDb('DB not configured')
  if (!route.ok) return route.response
  const { env, db, ctx } = route

  const authError = await ensureAuthenticatedRequest(req, db)
  if (authError) return authError

  try {
    const post = await getPostBySlug(db, slug)
    if (!post) {
      return jsonError('文章不存在', 404)
    }

    await deletePost(db, slug)

    // 清除 KV 缓存（失败不影响删除结果）
    try {
      await invalidatePublicContentCache(env)
    } catch (cacheErr) {
      console.warn('Cache invalidation failed:', cacheErr)
    }

    await enqueueBackgroundJob(
      env,
      {
        type: 'delete-post-related-index',
        postId: post.id,
      },
      {
        waitUntil: ctx?.waitUntil?.bind(ctx),
      },
    )

    return jsonOk({ success: true })
  } catch (error) {
    console.error('Delete post failed:', error)
    return jsonOk(
      {
        success: false,
        error: error instanceof Error ? error.message : '删除失败，请重试',
      },
      500,
    )
  }
}
