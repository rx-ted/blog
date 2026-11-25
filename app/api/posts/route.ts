import {
  createPost,
  deletePost,
  getCategories,
  getPostById,
  getPostBySlug,
  getPosts,
  rememberPostSlugAlias,
  updatePost,
  updatePostBySlug,
  type Database,
} from '@/lib/db'
import { invalidatePublicContentCache } from '@/lib/cache'
import { enqueueBackgroundJob } from '@/lib/background-jobs'
import { nanoid } from 'nanoid'
import { renderMarkdownToPublicHtml } from '@/lib/markdown/public'
import { buildAutoDescription, normalizePostSlug } from '@/lib/post-utils'
import {
  localizeRemotePostImages,
  recordLocalizedRemoteAssets,
  remoteImageResponse,
  type RemoteImageBucket,
  type RemoteImageLocalizationResult,
} from '@/lib/remote-image-localization'
import {
  ensureAuthenticatedRequest,
  getRouteContextWithDb,
  jsonError,
  jsonOk,
  parseJsonBody,
} from '@/lib/server/route-helpers'
import type { NextRequest } from 'next/server'

type PostWritePayload = Record<string, unknown>

type PostWriteEnv = Partial<CloudflareEnv> & {
  IMAGES?: RemoteImageBucket
  NEXT_PUBLIC_SITE_URL?: string
}

async function localizeWritePayload(
  env: PostWriteEnv,
  payload: PostWritePayload,
) {
  const localization = await localizeRemotePostImages({
    bucket: env.IMAGES,
    content: typeof payload.content === 'string' ? payload.content : undefined,
    html: typeof payload.html === 'string' ? payload.html : undefined,
    coverImage:
      typeof payload.cover_image === 'string' || payload.cover_image === null
        ? payload.cover_image
        : undefined,
    siteUrl: env.NEXT_PUBLIC_SITE_URL,
  })

  const localizedPayload: PostWritePayload = {
    ...payload,
    ...(typeof payload.content === 'string'
      ? { content: localization.content }
      : {}),
    ...(typeof payload.html === 'string' ? { html: localization.html } : {}),
    ...(typeof payload.cover_image === 'string' || payload.cover_image === null
      ? { cover_image: localization.coverImage }
      : {}),
  }

  return {
    payload: localizedPayload,
    localization,
  }
}

async function recordRemoteImages(
  db: D1Database,
  localization: RemoteImageLocalizationResult,
  target: { postId?: number | null; slug?: string | null },
) {
  if (localization.assets.length === 0) return
  await recordLocalizedRemoteAssets(db, localization.assets, target)
}

function normalizeTagsInput(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 10)
}

function normalizeBinaryFlag(value: unknown): 0 | 1 | undefined {
  if (value === 0 || value === false) return 0
  if (value === 1 || value === true) return 1
  return undefined
}

function parsePositiveInteger(value: unknown) {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function shouldUpsertPost(payload: PostWritePayload) {
  return (
    payload.upsert === true ||
    payload.mode === 'upsert' ||
    payload.on_conflict === 'update'
  )
}

async function normalizeCategoryForWrite(db: Database, value: unknown) {
  const category =
    typeof value === 'string' && value.trim() ? value.trim() : '未分类'

  const categories = await getCategories(db)
  const matched =
    categories.find(
      (item) => item.name === category || item.slug === category,
    ) ??
    categories.find(
      (item) =>
        item.name.toLowerCase() === category.toLowerCase() ||
        item.slug.toLowerCase() === category.toLowerCase(),
    )

  return matched?.name ?? category
}

async function buildHtmlContent(content: string, rawHtml: string) {
  return rawHtml || (await renderMarkdownToPublicHtml(content))
}

async function normalizeCreatePayload(db: Database, payload: PostWritePayload) {
  const title = typeof payload.title === 'string' ? payload.title.trim() : ''
  const content =
    typeof payload.content === 'string' ? payload.content.trim() : ''
  const rawHtml = typeof payload.html === 'string' ? payload.html.trim() : ''
  const category = await normalizeCategoryForWrite(db, payload.category)
  const customSlug =
    typeof payload.slug === 'string' ? normalizePostSlug(payload.slug) : ''
  const status: 'draft' | 'published' =
    payload.status === 'draft' ? 'draft' : 'published'
  const password =
    typeof payload.password === 'string' && payload.password.trim()
      ? payload.password.trim()
      : null
  const isHidden = normalizeBinaryFlag(payload.is_hidden) ?? 0
  const description =
    typeof payload.description === 'string' && payload.description.trim()
      ? payload.description.trim()
      : buildAutoDescription(content)
  const tags = normalizeTagsInput(payload.tags)
  const coverImage =
    typeof payload.cover_image === 'string' && payload.cover_image.trim()
      ? payload.cover_image.trim()
      : null

  return {
    title,
    content,
    rawHtml,
    category,
    customSlug,
    status,
    password,
    isHidden,
    description,
    tags,
    coverImage,
  }
}

async function buildPostUpdates(
  db: Database,
  payload: PostWritePayload,
  options: {
    currentSlug?: string
    existingContent?: string
    allowSlugRename?: boolean
  } = {},
) {
  const updates: Parameters<typeof updatePost>[2] = {}
  const nextSlug =
    typeof payload.new_slug === 'string'
      ? normalizePostSlug(payload.new_slug)
      : ''

  if (options.allowSlugRename && nextSlug && nextSlug !== options.currentSlug) {
    updates.slug = nextSlug
  }

  if (payload.title !== undefined && typeof payload.title === 'string') {
    updates.title = payload.title.trim()
  }

  const hasContent = typeof payload.content === 'string'
  const hasHtml = typeof payload.html === 'string'
  if (hasContent) updates.content = payload.content as string
  if (hasHtml) {
    updates.html = payload.html as string
  } else if (hasContent) {
    updates.html = await renderMarkdownToPublicHtml(payload.content as string)
  }

  if (payload.description !== undefined) {
    const rawDescription =
      typeof payload.description === 'string' ? payload.description.trim() : ''
    const rawContent =
      typeof payload.content === 'string'
        ? payload.content
        : options.existingContent || ''
    updates.description = rawDescription || buildAutoDescription(rawContent)
  } else if (hasContent) {
    updates.description = buildAutoDescription(payload.content as string)
  }

  if (payload.category !== undefined) {
    updates.category = await normalizeCategoryForWrite(db, payload.category)
  }
  if (payload.tags !== undefined)
    updates.tags = normalizeTagsInput(payload.tags)
  if (payload.cover_image !== undefined) {
    updates.cover_image =
      typeof payload.cover_image === 'string' && payload.cover_image.trim()
        ? payload.cover_image.trim()
        : null
  }
  if (
    payload.status === 'draft' ||
    payload.status === 'published' ||
    payload.status === 'deleted'
  ) {
    updates.status = payload.status
  }
  if (payload.password !== undefined) {
    updates.password =
      typeof payload.password === 'string' && payload.password.trim()
        ? payload.password.trim()
        : null
  }

  const isHidden = normalizeBinaryFlag(payload.is_hidden)
  if (isHidden !== undefined) updates.is_hidden = isHidden
  const isPinned = normalizeBinaryFlag(payload.is_pinned)
  if (isPinned !== undefined) updates.is_pinned = isPinned

  return updates
}

function readPostTargetFromPayload(payload: PostWritePayload) {
  const id = parsePositiveInteger(payload.current_id ?? payload.id)
  const slug =
    typeof payload.current_slug === 'string' && payload.current_slug.trim()
      ? payload.current_slug.trim()
      : typeof payload.slug === 'string'
        ? payload.slug.trim()
        : ''
  return { id, slug }
}

function readPostTargetFromUrl(req: NextRequest) {
  const url = new URL(req.url)
  return {
    id: parsePositiveInteger(url.searchParams.get('id')),
    slug: url.searchParams.get('slug')?.trim() || '',
  }
}

async function enqueuePostWriteJobs(
  env: Partial<CloudflareEnv>,
  ctx: { waitUntil?: (promise: Promise<unknown>) => void } | null | undefined,
  postId: number,
) {
  await enqueueBackgroundJob(
    env,
    {
      type: 'process-post-ai',
      postId,
    },
    {
      waitUntil: ctx?.waitUntil?.bind(ctx),
    },
  )

  await enqueueBackgroundJob(
    env,
    {
      type: 'sync-post-related-index',
      postId,
    },
    {
      waitUntil: ctx?.waitUntil?.bind(ctx),
    },
  )
}

export async function POST(req: NextRequest) {
  try {
    const route = await getRouteContextWithDb('数据库未配置')
    if (!route.ok) return route.response
    const { env, db, ctx } = route

    // 2. 统一认证：Cookie OR Bearer Token
    const authError = await ensureAuthenticatedRequest(req, db)
    if (authError) return authError

    const rawPayload = await parseJsonBody<Record<string, unknown>>(req)
    const { payload, localization } = await localizeWritePayload(
      env,
      rawPayload,
    )
    const {
      title,
      content,
      rawHtml,
      category,
      customSlug,
      status,
      password,
      isHidden,
      description,
      tags,
      coverImage,
    } = await normalizeCreatePayload(db, payload)

    if (!title || !content) {
      return jsonError('标题和内容不能为空', 400)
    }

    // 2. 生成 slug（日期 + 随机）
    const date = new Date().toISOString().split('T')[0]
    const slug = customSlug || `${date}-${nanoid(6)}`

    if (shouldUpsertPost(payload) && customSlug) {
      const existing = await getPostBySlug(db, customSlug)
      if (existing) {
        const updates = await buildPostUpdates(
          db,
          {
            ...payload,
            current_slug: existing.slug,
            new_slug:
              typeof payload.new_slug === 'string'
                ? payload.new_slug
                : undefined,
          },
          {
            currentSlug: existing.slug,
            existingContent: existing.content,
            allowSlugRename: true,
          },
        )

        if (Object.keys(updates).length > 0) {
          await updatePost(db, existing.id, updates)
          await rememberPostSlugAlias(
            db,
            existing.id,
            existing.slug,
            typeof updates.slug === 'string' ? updates.slug : existing.slug,
          )
          await recordRemoteImages(db, localization, {
            postId: existing.id,
            slug:
              typeof updates.slug === 'string' ? updates.slug : existing.slug,
          })
          await invalidatePublicContentCache(env)
          await enqueuePostWriteJobs(env, ctx, existing.id)
        }

        const persistedSlug =
          typeof updates.slug === 'string' ? updates.slug : existing.slug
        return jsonOk({
          success: true,
          action: 'updated',
          slug: persistedSlug,
          id: existing.id,
          category:
            typeof updates.category === 'string'
              ? updates.category
              : existing.category,
          tags: Array.isArray(updates.tags) ? updates.tags : existing.tags,
          description:
            typeof updates.description === 'string'
              ? updates.description
              : existing.description,
          cover_image:
            updates.cover_image !== undefined
              ? updates.cover_image
              : existing.cover_image,
          ...remoteImageResponse(localization.report),
        })
      }
    }

    // 3. 优先使用编辑器直接生成的 HTML，兼容旧版 Markdown 提交
    const htmlContent = await buildHtmlContent(content, rawHtml)

    // 4. 立即保存到 D1（不等 AI）
    const postId = await createPost(db, {
      slug,
      title,
      content,
      html: htmlContent,
      description,
      category,
      tags,
      status,
      password,
      is_hidden: isHidden,
      cover_image: coverImage,
    })

    await recordRemoteImages(db, localization, { postId, slug })

    // 6. 清除缓存
    await invalidatePublicContentCache(env)

    await enqueuePostWriteJobs(env, ctx, postId)

    return jsonOk({
      success: true,
      action: 'created',
      slug,
      id: postId,
      category,
      tags,
      description,
      cover_image: coverImage,
      ...remoteImageResponse(localization.report),
    })
  } catch (error) {
    if (
      error instanceof Error &&
      /UNIQUE constraint failed: posts\.slug/i.test(error.message)
    ) {
      return jsonError('slug 已存在，请换一个', 409)
    }
    console.error('Save error:', error)
    return jsonError(`保存失败: ${(error as Error).message}`, 500)
  }
}

// GET: 外部发布工具读取单篇文章或列出文章
export async function GET(req: NextRequest) {
  try {
    const route = await getRouteContextWithDb('数据库未配置')
    if (!route.ok) return route.response
    const { db } = route

    const authError = await ensureAuthenticatedRequest(req, db)
    if (authError) return authError

    const url = new URL(req.url)
    const { id, slug } = readPostTargetFromUrl(req)

    if (id) {
      const post = await getPostById(db, id)
      if (!post) return jsonError('文章不存在', 404)
      return jsonOk({ success: true, post })
    }

    if (slug) {
      const post = await getPostBySlug(db, slug)
      if (!post) return jsonError('文章不存在', 404)
      return jsonOk({ success: true, post })
    }

    const limit = Math.min(
      Math.max(parsePositiveInteger(url.searchParams.get('limit')) ?? 50, 1),
      100,
    )
    const offset = Math.max(
      parsePositiveInteger(url.searchParams.get('offset')) ?? 0,
      0,
    )
    const posts = await getPosts(db, limit, offset, true, true, true, true)

    return jsonOk({ success: true, posts, limit, offset })
  } catch (error) {
    console.error('Read posts error:', error)
    return jsonError(`读取文章失败: ${(error as Error).message}`, 500)
  }
}

// PATCH: 自动保存（只更新变化的字段）
export async function PATCH(req: NextRequest) {
  try {
    const route = await getRouteContextWithDb('数据库未配置')
    if (!route.ok) return route.response
    const { env, db } = route

    const authError = await ensureAuthenticatedRequest(req, db)
    if (authError) return authError

    const rawPayload = await parseJsonBody<Record<string, unknown>>(req)
    const { id: currentId, slug: currentSlug } =
      readPostTargetFromPayload(rawPayload)

    if (!currentSlug && !currentId) {
      return jsonError('slug 不能为空', 400)
    }

    const existingPost = currentId
      ? await getPostById(db, currentId)
      : currentSlug
        ? await getPostBySlug(db, currentSlug)
        : null

    const { payload, localization } = await localizeWritePayload(
      env,
      rawPayload,
    )

    const updates = await buildPostUpdates(db, payload, {
      currentSlug: existingPost?.slug || currentSlug,
      existingContent: existingPost?.content || '',
      allowSlugRename: true,
    })

    if (Object.keys(updates).length === 0) {
      if (currentId) {
        if (!existingPost) return jsonError('文章不存在', 404)
        return jsonOk({
          success: true,
          id: currentId,
          slug: existingPost.slug || currentSlug,
          ...remoteImageResponse(localization.report),
        })
      }
      return jsonOk({
        success: true,
        slug: currentSlug,
        ...remoteImageResponse(localization.report),
      })
    }

    let persistedSlug =
      typeof updates.slug === 'string' ? updates.slug : currentSlug
    if (currentId) {
      if (!existingPost) return jsonError('文章不存在', 404)

      await updatePost(db, currentId, updates)
      persistedSlug =
        typeof updates.slug === 'string' ? updates.slug : existingPost.slug
      await rememberPostSlugAlias(
        db,
        currentId,
        currentSlug || null,
        persistedSlug,
      )
    } else {
      await updatePostBySlug(db, currentSlug, updates)
    }

    await recordRemoteImages(db, localization, {
      postId: currentId ?? existingPost?.id,
      slug: persistedSlug,
    })

    // 清除缓存
    await invalidatePublicContentCache(env)

    return jsonOk({
      success: true,
      id: currentId ?? undefined,
      slug: persistedSlug,
      ...remoteImageResponse(localization.report),
    })
  } catch (error) {
    if (
      error instanceof Error &&
      /UNIQUE constraint failed: posts\.slug/i.test(error.message)
    ) {
      return jsonError('slug 已存在，请换一个', 409)
    }
    if (error instanceof Error && /文章不存在/i.test(error.message)) {
      return jsonError('文章不存在', 404)
    }
    console.error('Auto-save error:', error)
    return jsonError(`自动保存失败: ${(error as Error).message}`, 500)
  }
}

// PUT: 外部发布工具显式更新文章，语义上等同于带完整 payload 的 PATCH
export async function PUT(req: NextRequest) {
  return PATCH(req)
}

// DELETE: 外部发布工具删除文章
export async function DELETE(req: NextRequest) {
  try {
    const route = await getRouteContextWithDb('数据库未配置')
    if (!route.ok) return route.response
    const { env, db, ctx } = route

    const authError = await ensureAuthenticatedRequest(req, db)
    if (authError) return authError

    const urlTarget = readPostTargetFromUrl(req)
    let target = urlTarget

    if (!target.id && !target.slug) {
      try {
        const payload = (await req.json()) as PostWritePayload
        target = readPostTargetFromPayload(payload)
      } catch {
        // DELETE without JSON body is valid; query params are handled above.
      }
    }

    if (!target.id && !target.slug) {
      return jsonError('slug 不能为空', 400)
    }

    const post = target.id
      ? await getPostById(db, target.id)
      : await getPostBySlug(db, target.slug)
    if (!post) return jsonError('文章不存在', 404)

    await deletePost(db, post.slug)
    await invalidatePublicContentCache(env)

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

    return jsonOk({ success: true, id: post.id, slug: post.slug })
  } catch (error) {
    console.error('Delete post error:', error)
    return jsonError(`删除文章失败: ${(error as Error).message}`, 500)
  }
}
